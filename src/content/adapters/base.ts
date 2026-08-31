import type {
  FeedChannel,
  FeedItem,
  FeedLoadResult,
  FeedSource,
} from '../../types/feed';

export type FeedItemsListener = (items: FeedItem[]) => void;
export type FeedChannelsListener = (channels: FeedChannel[]) => void;

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

export interface RuntimeFeedChannelBinding {
  channel: FeedChannel;
  element: HTMLElement;
}

export interface AdapterDefinition {
  source: FeedSource;
  matches: (url: URL) => boolean;
  create: (onItems: FeedItemsListener) => BaseAdapter;
}

interface FeedChannelCollectionOptions {
  isActive?: (element: HTMLElement) => boolean;
}

/** 把站点导航控件转换成轻量描述，同时保留真实 DOM 作为点击代理目标。 */
export function collectFeedChannelBindings(
  root: ParentNode,
  selector: string,
  pageUrl: URL,
  options: FeedChannelCollectionOptions = {},
): RuntimeFeedChannelBinding[] {
  const bindings: RuntimeFeedChannelBinding[] = [];
  const knownIds = new Set<string>();

  Array.from(root.querySelectorAll<HTMLElement>(selector)).forEach((element, index) => {
    // CSS-in-JS may temporarily place style tags inside navigation controls during hydration.
    // Their textContent is not visible UI and must not leak into OneFeed's channel label.
    const labelSource = element.cloneNode(true) as HTMLElement;
    labelSource.querySelectorAll('style, script, template, noscript')
      .forEach((node) => node.remove());
    const label = labelSource.textContent?.replace(/\s+/g, ' ').trim() || '';
    if (!label) return;

    const rawHref = element.getAttribute('href')?.trim();
    let target = '';
    if (rawHref) {
      try {
        const targetUrl = new URL(rawHref, pageUrl);
        target = `${targetUrl.origin}${targetUrl.pathname}${targetUrl.search}`;
      } catch {
        target = rawHref;
      }
    }
    const semanticKey = element.getAttribute('data-key') ||
      element.getAttribute('data-value') ||
      element.getAttribute('aria-controls') ||
      label;
    const id = target || `${semanticKey}:${index}`;
    if (knownIds.has(id)) return;
    knownIds.add(id);

    const active = options.isActive?.(element) ?? (
      element.getAttribute('aria-current') === 'page' ||
      element.getAttribute('aria-selected') === 'true' ||
      element.getAttribute('aria-pressed') === 'true' ||
      /(?:^|[-_])(active|current|selected)(?:$|[-_])/.test(element.className) ||
      element.parentElement?.matches('.active, .current, .selected, [aria-current="page"]') === true
    );
    bindings.push({ channel: { id, label, active }, element });
  });

  return bindings;
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
  private readonly runtimeFeedChannelBindings = new Map<string, HTMLElement>();
  private feedChannels: FeedChannel[] = [];
  private feedChannelsListener?: FeedChannelsListener;
  private feedChannelsSignature = '';

  protected abstract readonly cardSelector: string;
  protected readonly loadingStrategy: FeedLoadingStrategy = { kind: 'source-scroll' };

  constructor(private readonly onItems: FeedItemsListener) {}

  init(): void {
    const pageUrl = new URL(window.location.href);
    this.livePageContext = { root: document, url: pageUrl, live: true };
    this.visitedPageUrls.add(this.normalizePageUrl(pageUrl));
    this.processCards(this.livePageContext);
    this.refreshFeedChannels();
    this.observer = new MutationObserver(() => {
      window.clearTimeout(this.timer);
      this.timer = window.setTimeout(() => {
        if (this.livePageContext) {
          this.processCards(this.livePageContext);
          this.refreshFeedChannels();
        }
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
    this.runtimeFeedChannelBindings.clear();
    this.knownItemIds.clear();
    this.visitedPageUrls.clear();
    this.feedChannels = [];
    this.feedChannelsListener = undefined;
    this.feedChannelsSignature = '';
  }

  abstract parseCard(element: Element, context: FeedPageContext): FeedItem | null;
  abstract triggerAction(itemId: string, actionId: string): boolean;

  /** 返回 undefined 表示当前 Feed Adapter 尚未提供原站检索能力。 */
  getInitialSearchQuery(): string | undefined {
    return undefined;
  }

  /** 检索必须交给原站执行；BaseAdapter 不提供本地条目过滤回退。 */
  triggerSearch(query: string): boolean {
    void query;
    return false;
  }

  setFeedChannelsListener(listener: FeedChannelsListener): void {
    this.feedChannelsListener = listener;
    listener(this.getFeedChannels());
  }

  getFeedChannels(): FeedChannel[] {
    return this.feedChannels.map((channel) => ({ ...channel }));
  }

  triggerFeedChannel(channelId: string): boolean {
    const element = this.runtimeFeedChannelBindings.get(channelId);
    if (!element) return false;

    // 同 URL 的站内 Tab 也需要重新接收当前 DOM 中的项目，避免沿用旧频道去重状态。
    this.knownItemIds.clear();
    this.runtimeBindings.clear();
    element.click();
    window.setTimeout(() => this.refreshFeedChannels(), 0);
    return true;
  }

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

  protected getFeedChannelBindings(root: ParentNode): RuntimeFeedChannelBinding[] {
    void root;
    return [];
  }

  private refreshFeedChannels(): void {
    const bindings = this.getFeedChannelBindings(document);
    this.runtimeFeedChannelBindings.clear();
    bindings.forEach(({ channel, element }) => {
      this.runtimeFeedChannelBindings.set(channel.id, element);
    });

    const channels = bindings.map(({ channel }) => channel);
    const signature = JSON.stringify(channels);
    if (signature === this.feedChannelsSignature) return;
    this.feedChannelsSignature = signature;
    this.feedChannels = channels;
    this.feedChannelsListener?.(this.getFeedChannels());
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
