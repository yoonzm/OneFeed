import type { FeedItem, FeedLoadResult, FeedSource } from '../../types/feed';

export type FeedItemsListener = (items: FeedItem[]) => void;

export interface FeedPageContext {
  root: ParentNode;
  url: URL;
  live: boolean;
}

export type FeedLoadingStrategy =
  | { kind: 'source-scroll' }
  | { kind: 'dom-control'; selector: string }
  | { kind: 'document-page'; nextSelector: string };

export interface RuntimeCardBinding {
  element: Element;
  pageUrl: URL;
  live: boolean;
}

export interface AdapterDefinition {
  source: FeedSource;
  matches: (url: URL) => boolean;
  create: (onItems: FeedItemsListener) => BaseAdapter;
}

export abstract class BaseAdapter {
  private observer?: MutationObserver;
  private timer?: number;
  private loadAbortController?: AbortController;
  private loadPromise?: Promise<FeedLoadResult>;
  private livePageContext?: FeedPageContext;
  private nextPageUrl?: URL | null;
  private disconnected = false;
  private readonly knownItemIds = new Set<string>();
  private readonly visitedPageUrls = new Set<string>();
  private readonly runtimeBindings = new Map<string, RuntimeCardBinding>();

  protected abstract readonly cardSelector: string;
  protected readonly loadingStrategy: FeedLoadingStrategy = { kind: 'source-scroll' };

  constructor(private readonly onItems: FeedItemsListener) {}

  init(): void {
    const pageUrl = new URL(window.location.href);
    this.livePageContext = { root: document, url: pageUrl, live: true };
    this.visitedPageUrls.add(this.normalizePageUrl(pageUrl));
    this.processCards(this.livePageContext);
    this.observer = new MutationObserver(() => {
      window.clearTimeout(this.timer);
      this.timer = window.setTimeout(() => {
        if (this.livePageContext) this.processCards(this.livePageContext);
      }, 120);
    });
    this.observer.observe(document.body, { childList: true, subtree: true });
  }

  disconnect(): void {
    this.disconnected = true;
    this.observer?.disconnect();
    window.clearTimeout(this.timer);
    this.loadAbortController?.abort();
    this.runtimeBindings.clear();
    this.knownItemIds.clear();
    this.visitedPageUrls.clear();
  }

  abstract parseCard(element: Element, context: FeedPageContext): FeedItem | null;
  abstract triggerAction(itemId: string, actionId: string): boolean;

  requestMore(): Promise<FeedLoadResult> {
    if (this.disconnected) {
      return Promise.resolve({ kind: 'failed', retryable: false });
    }
    if (this.loadPromise) return this.loadPromise;

    const controller = new AbortController();
    this.loadAbortController = controller;
    const request = this.performLoad(controller.signal)
      .catch((): FeedLoadResult => ({
        kind: 'failed',
        retryable: !controller.signal.aborted,
      }))
      .then((result) => {
        if (this.loadPromise === request) {
          this.loadPromise = undefined;
          this.loadAbortController = undefined;
        }
        return result;
      });
    this.loadPromise = request;
    return request;
  }

  protected getCards(root: ParentNode): Element[] {
    return Array.from(root.querySelectorAll(this.cardSelector));
  }

  protected getRuntimeElement(itemId: string): Element | undefined {
    return this.runtimeBindings.get(itemId)?.element;
  }

  protected getRuntimeBinding(itemId: string): RuntimeCardBinding | undefined {
    return this.runtimeBindings.get(itemId);
  }

  private processCards(context: FeedPageContext): { parsed: number; added: number } {
    let added = 0;
    const items = this.getCards(context.root)
      .map((card) => {
        const item = this.parseCard(card, context);
        if (item) {
          this.runtimeBindings.set(item.id, {
            element: card,
            pageUrl: context.url,
            live: context.live,
          });
          if (!this.knownItemIds.has(item.id)) {
            this.knownItemIds.add(item.id);
            added += 1;
          }
        }
        return item;
      })
      .filter((item): item is FeedItem => item !== null);
    if (items.length) this.onItems(items);
    return { parsed: items.length, added };
  }

  private async performLoad(signal: AbortSignal): Promise<FeedLoadResult> {
    if (this.loadingStrategy.kind === 'source-scroll') {
      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: 'smooth',
      });
      return { kind: 'loaded', added: 0, hasMore: true };
    }

    if (this.loadingStrategy.kind === 'dom-control') {
      const control = document.querySelector<HTMLElement>(this.loadingStrategy.selector);
      if (!control) return { kind: 'exhausted' };
      control.click();
      return { kind: 'loaded', added: 0, hasMore: true };
    }

    return this.loadDocumentPage(this.loadingStrategy.nextSelector, signal);
  }

  private async loadDocumentPage(
    nextSelector: string,
    signal: AbortSignal,
  ): Promise<FeedLoadResult> {
    const liveContext = this.livePageContext;
    if (!liveContext) return { kind: 'failed', retryable: false };

    const nextUrl = this.nextPageUrl === undefined
      ? this.findNextPageUrl(liveContext, nextSelector)
      : this.nextPageUrl;
    if (!nextUrl) return { kind: 'exhausted' };
    if (this.visitedPageUrls.has(this.normalizePageUrl(nextUrl))) {
      this.nextPageUrl = null;
      return { kind: 'exhausted' };
    }

    const response = await fetch(nextUrl, {
      credentials: 'include',
      headers: { Accept: 'text/html' },
      redirect: 'follow',
      signal,
    });
    if (!response.ok) throw new Error(`Unexpected response status: ${response.status}`);
    const contentType = response.headers.get('content-type');
    if (contentType && !contentType.toLowerCase().includes('text/html')) {
      throw new Error(`Unexpected response content type: ${contentType}`);
    }

    const html = await response.text();
    if (signal.aborted) throw new DOMException('Feed load aborted', 'AbortError');
    const responseUrl = new URL(response.url || nextUrl.href);
    if (responseUrl.origin !== liveContext.url.origin) {
      throw new Error('Cross-origin feed pagination is not allowed');
    }

    // 抓取页只在离线文档中解析，避免脚本、样式或重复 id 污染原站 DOM。
    const page = new DOMParser().parseFromString(html, 'text/html');
    const context: FeedPageContext = { root: page, url: responseUrl, live: false };
    const parsed = this.processCards(context);
    if (!parsed.parsed) throw new Error('The next feed page contained no parseable cards');

    this.visitedPageUrls.add(this.normalizePageUrl(nextUrl));
    this.visitedPageUrls.add(this.normalizePageUrl(responseUrl));
    const followingUrl = this.findNextPageUrl(context, nextSelector);
    this.nextPageUrl = followingUrl &&
      !this.visitedPageUrls.has(this.normalizePageUrl(followingUrl))
      ? followingUrl
      : null;

    return {
      kind: 'loaded',
      added: parsed.added,
      hasMore: this.nextPageUrl !== null,
    };
  }

  private findNextPageUrl(context: FeedPageContext, selector: string): URL | null {
    const href = context.root.querySelector<HTMLAnchorElement>(selector)?.getAttribute('href');
    if (!href) return null;
    try {
      const nextUrl = new URL(href, context.url);
      return nextUrl.origin === this.livePageContext?.url.origin ? nextUrl : null;
    } catch {
      return null;
    }
  }

  private normalizePageUrl(url: URL): string {
    const normalized = new URL(url);
    normalized.hash = '';
    return normalized.href;
  }
}
