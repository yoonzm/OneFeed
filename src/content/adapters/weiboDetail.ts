import type { ArticleDetail } from '../../types/detail';
import type { DetailAdapterDefinition, DetailListener } from './detail';
import {
  parseWeiboCard,
  triggerWeiboAction,
  WEIBO_SOURCE,
} from './weibo';

const DETAIL_CARD_SELECTOR = 'main article';
const SUPPORTED_HOSTS = new Set(['weibo.com', 'www.weibo.com']);

function normalizedPath(url: URL): string {
  return url.pathname.replace(/\/+$/, '');
}

export function isWeiboDetailUrl(url: URL): boolean {
  return SUPPORTED_HOSTS.has(url.hostname) &&
    /^\/\d+\/[A-Za-z0-9]+\/?$/.test(url.pathname);
}

export function parseWeiboDetail(
  element: Element,
  url = new URL(window.location.href),
): ArticleDetail | null {
  if (!/^\/\d+\/[A-Za-z0-9]+\/?$/.test(url.pathname)) return null;

  const item = parseWeiboCard(element, url);
  if (!item || normalizedPath(new URL(item.originalUrl)) !== normalizedPath(url)) return null;

  return {
    id: item.id,
    platform: item.platform,
    source: item.source,
    originalUrl: item.originalUrl,
    kind: 'article',
    role: 'post',
    author: item.author,
    publishedAt: item.publishedAt,
    body: item.previewBlocks,
    actionSlots: {
      footer: {
        metrics: item.metrics,
        actions: item.actions.filter((action) => action.kind !== 'open'),
      },
    },
  };
}

interface ParsedWeiboDetail {
  element: Element;
  content: ArticleDetail;
}

function findParsedWeiboDetail(root: ParentNode, url: URL): ParsedWeiboDetail | null {
  for (const element of root.querySelectorAll(DETAIL_CARD_SELECTOR)) {
    const content = parseWeiboDetail(element, url);
    if (content) return { element, content };
  }
  return null;
}

/** 只接受永久链接与当前路由一致的主帖，避免 SPA 切换期间发布旧页面内容。 */
export function findWeiboDetailRoot(root: ParentNode, url: URL): Element | null {
  return findParsedWeiboDetail(root, url)?.element || null;
}

export class WeiboDetailAdapter {
  private observer?: MutationObserver;
  private timer?: number;
  private runtimeElement?: Element;
  private itemId?: string;

  constructor(private readonly onDetail: DetailListener) {}

  init(): void {
    this.processDetail();
    this.observer = new MutationObserver(() => {
      window.clearTimeout(this.timer);
      this.timer = window.setTimeout(() => this.processDetail(), 120);
    });
    this.observer.observe(document.body, { childList: true, subtree: true });
  }

  disconnect(): void {
    this.observer?.disconnect();
    window.clearTimeout(this.timer);
    this.runtimeElement = undefined;
    this.itemId = undefined;
  }

  triggerAction(itemId: string, actionId: string): boolean {
    if (itemId !== this.itemId) return false;
    return triggerWeiboAction(this.runtimeElement, actionId);
  }

  private processDetail(): void {
    const url = new URL(window.location.href);
    const parsed = findParsedWeiboDetail(document, url);
    if (!parsed) return;

    this.runtimeElement = parsed.element;
    this.itemId = parsed.content.id;
    this.onDetail(parsed.content);
  }
}

export const weiboDetailAdapterDefinition: DetailAdapterDefinition = {
  source: WEIBO_SOURCE,
  surface: 'article',
  matches: isWeiboDetailUrl,
  create: (onDetail) => new WeiboDetailAdapter(onDetail),
};
