import { WEREAD_PLATFORM } from '../../config/platforms';
import { i18n } from '../../i18n';
import type { FeedBlock, FeedItem, FeedMetric } from '../../types/feed';
import {
  BaseAdapter,
  collectFeedChannelBindings,
  type AdapterDefinition,
  type FeedPageContext,
  type RuntimeFeedChannelBinding,
} from './base';

const CARD_SELECTOR = '.wr_bookList_item';
const CATEGORY_PATH_PATTERN = /^\/web\/category\/[^/]+\/?$/;
const SEARCH_PATH = '/web/search/books';

export const WEREAD_SOURCE = WEREAD_PLATFORM;

function absoluteUrl(value: string, pageUrl: URL): string {
  if (!value) return '';
  try {
    return new URL(value, pageUrl).href;
  } catch {
    return '';
  }
}

function normalizedText(element: Element | null): string {
  return element?.textContent?.replace(/\s+/g, ' ').trim() || '';
}

/** 微信读书同时使用精确数字与“万”缩写，统一转换后才能参与排序。 */
export function parseWereadNumber(value: string): number | undefined {
  const normalized = value.replace(/,/g, '').replace(/\s+/g, '').trim();
  const match = normalized.match(/-?\d+(?:\.\d+)?/);
  if (!match) return undefined;
  const numeric = Number(match[0]);
  if (!Number.isFinite(numeric)) return undefined;
  if (normalized.includes('万')) return Math.round(numeric * 10_000);
  if (/k/i.test(normalized)) return Math.round(numeric * 1_000);
  return numeric;
}

function createSummaryBlock(text: string): FeedBlock | null {
  if (!text) return null;
  const paragraph = document.createElement('p');
  paragraph.textContent = text;
  return { type: 'richText', html: paragraph.outerHTML, plainText: text };
}

function createMetrics(element: Element): FeedMetric[] {
  const metrics: FeedMetric[] = [];
  const readingCount = parseWereadNumber(
    normalizedText(element.querySelector('.wr_bookList_item_reading_number')),
  );
  if (readingCount !== undefined) {
    metrics.push({
      kind: 'views',
      value: readingCount,
      label: i18n.t('adapter.todayReading'),
    });
  }

  const recommendationScore = parseWereadNumber(
    normalizedText(element.querySelector('.wr_bookList_item_reading_percent')),
  );
  if (recommendationScore !== undefined) {
    metrics.push({
      kind: 'score',
      value: recommendationScore,
      label: i18n.t('adapter.recommendationScore'),
    });
  }
  return metrics;
}

export function parseWereadCard(
  element: Element,
  pageUrl = new URL(window.location.href),
): FeedItem | null {
  const bookLink = element.querySelector<HTMLAnchorElement>(
    '.wr_bookList_item_link[href*="/web/reader/"], '
      + '.wr_bookList_item_link[href*="/web/bookDetail/"]',
  );
  const originalUrl = absoluteUrl(bookLink?.getAttribute('href') || '', pageUrl);
  const bookId = originalUrl.match(/\/web\/(?:reader|bookDetail)\/([^/?#]+)/)?.[1];
  const title = normalizedText(element.querySelector('.wr_bookList_item_title'));
  if (!bookId || !title) return null;

  const authorLink = element.querySelector<HTMLAnchorElement>('.wr_bookList_item_author a[href]');
  const cover = element.querySelector<HTMLImageElement>('.wr_bookCover_img');
  const coverUrl = absoluteUrl(
    cover?.getAttribute('data-src') || cover?.getAttribute('src') || '',
    pageUrl,
  );
  const summary = createSummaryBlock(
    normalizedText(element.querySelector('.wr_bookList_item_desc')),
  );

  return {
    id: `weread_${bookId}`,
    platform: 'weread',
    source: WEREAD_SOURCE,
    originalUrl,
    // 图书列表只负责发现入口；阅读器正文由独立的 Article Detail Adapter 接管。
    kind: 'article',
    role: 'article',
    title,
    author: {
      name: normalizedText(element.querySelector('.wr_bookList_item_author')),
      avatar: '',
      link: absoluteUrl(authorLink?.getAttribute('href') || '', pageUrl) || undefined,
    },
    previewBlocks: [
      ...(summary ? [summary] : []),
      ...(coverUrl ? [{
        type: 'gallery' as const,
        items: [{ url: coverUrl, alt: cover?.getAttribute('alt') || title }],
      }] : []),
    ],
    metrics: createMetrics(element),
    actions: [{ id: 'open', kind: 'open', label: i18n.t('adapter.openOriginal'), enabled: true }],
  };
}

export function createWereadSearchUrl(query: string): URL | null {
  const normalized = query.trim();
  if (!normalized) return null;
  const target = new URL(SEARCH_PATH, WEREAD_SOURCE.homeUrl);
  target.searchParams.set('keyword', normalized);
  return target;
}

export function isWereadFeedUrl(url: URL): boolean {
  if (url.hostname !== 'weread.qq.com') return false;
  if (CATEGORY_PATH_PATTERN.test(url.pathname)) return true;
  if (url.pathname.replace(/\/+$/, '') !== SEARCH_PATH) return false;
  return Boolean(
    url.searchParams.get('keyword')?.trim() || url.searchParams.get('author')?.trim(),
  );
}

export class WereadAdapter extends BaseAdapter {
  protected readonly cardSelector = CARD_SELECTOR;

  protected override getFeedChannelBindings(root: ParentNode): RuntimeFeedChannelBinding[] {
    return collectFeedChannelBindings(
      root,
      '#ranking_page_sidebar .ranking_list_item_link[href]',
      new URL(window.location.href),
      {
        isActive: (element) => element.parentElement
          ?.classList.contains('ranking_list_item_current') === true,
      },
    );
  }

  parseCard(element: Element, context: FeedPageContext): FeedItem | null {
    return parseWereadCard(element, context.url);
  }

  triggerAction(itemId: string, actionId: string): boolean {
    void itemId;
    void actionId;
    return false;
  }

  override getInitialSearchQuery(): string {
    const url = new URL(window.location.href);
    return url.pathname.replace(/\/+$/, '') === SEARCH_PATH
      ? url.searchParams.get('keyword')?.trim() || ''
      : '';
  }

  override triggerSearch(query: string): boolean {
    const target = createWereadSearchUrl(query);
    if (!target) return false;
    window.location.assign(target.href);
    return true;
  }
}

export const wereadAdapterDefinition: AdapterDefinition = {
  source: WEREAD_SOURCE,
  matches: isWereadFeedUrl,
  create: (onItems) => new WereadAdapter(onItems),
};
