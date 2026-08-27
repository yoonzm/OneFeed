import { THIRTY_SIX_KR_PLATFORM } from '../../config/platforms';
import { i18n } from '../../i18n';
import type { FeedBlock, FeedItem } from '../../types/feed';
import {
  BaseAdapter,
  collectFeedChannelBindings,
  type AdapterDefinition,
  type FeedPageContext,
  type RuntimeFeedChannelBinding,
} from './base';

const CARD_SELECTOR = '.information-flow-list > .information-flow-item';
const LOAD_MORE_SELECTOR = '.kr-loading-more-button.show';
const SUPPORTED_PATHS = new Set([
  '/information/web_news',
  '/information/web_news/latest',
  '/information/web_recommend',
  '/information/contact',
  '/information/ccs',
  '/information/travel',
  '/information/AI',
  '/information/technology',
  '/information/aireport',
  '/information/shuzihua',
  '/information/innovate',
  '/information/enterpriseservice',
  '/information/happy_life',
  '/information/real_estate',
  '/information/web_zhichang',
  '/information/qiyehao',
  '/information/sensation',
  '/information/other',
]);

export const THIRTY_SIX_KR_SOURCE = THIRTY_SIX_KR_PLATFORM;

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

function createSummaryBlock(text: string): FeedBlock | null {
  if (!text) return null;
  const paragraph = document.createElement('p');
  paragraph.textContent = text;
  return { type: 'richText', html: paragraph.outerHTML, plainText: text };
}

export function parseThirtySixKrCard(
  element: Element,
  pageUrl = new URL(window.location.href),
): FeedItem | null {
  const titleLink = element.querySelector<HTMLAnchorElement>(
    '.article-item-title',
  );
  const title = normalizedText(titleLink);
  const linkUrl = absoluteUrl(
    titleLink?.getAttribute('href') ||
      element.querySelector('.article-item-pic')?.getAttribute('href') ||
      '',
    pageUrl,
  );
  // 个别卡片会漏掉全部文章 href，但首个 anchor-* 标记仍携带稳定文章 ID。
  const markerId = Array.from(
    element.querySelector('[class*="anchor-"]')?.classList || [],
  ).find((className) => /^anchor-\d+$/.test(className))?.slice('anchor-'.length);
  const originId = linkUrl.match(/\/p\/(\d+)/)?.[1] || markerId;
  if (!title || !originId) return null;
  const originalUrl = linkUrl || absoluteUrl(`/p/${originId}`, pageUrl);

  const authorLink = element.querySelector<HTMLAnchorElement>('.kr-flow-bar-author[href]');
  const categoryLink = element.querySelector<HTMLAnchorElement>('.article-item-channel[href]');
  const motifLink = element.querySelector<HTMLAnchorElement>('.kr-flow-bar-motif a[href]');
  const summary = createSummaryBlock(
    normalizedText(element.querySelector('.article-item-description')),
  );
  const image = element.querySelector<HTMLImageElement>('.article-item-pic img');
  const imageUrl = absoluteUrl(
    image?.getAttribute('data-src') || image?.getAttribute('src') || '',
    pageUrl,
  );
  const categoryName = normalizedText(categoryLink);
  const motifName = normalizedText(motifLink);

  return {
    id: `36kr_${originId}`,
    platform: '36kr',
    source: THIRTY_SIX_KR_SOURCE,
    originalUrl,
    kind: 'article',
    role: 'article',
    title,
    author: {
      name: normalizedText(authorLink),
      avatar: '',
      link: absoluteUrl(authorLink?.getAttribute('href') || '', pageUrl) || undefined,
    },
    context: categoryName || motifName ? {
      ...(categoryName ? {
        community: {
          name: categoryName,
          url: absoluteUrl(categoryLink?.getAttribute('href') || '', pageUrl) || undefined,
        },
      } : {}),
      ...(motifName ? {
        tags: [{
          name: motifName,
          url: absoluteUrl(motifLink?.getAttribute('href') || '', pageUrl) || undefined,
        }],
      } : {}),
    } : undefined,
    // 列表只提供相对时间，保留原站文案比推算一个不精确的绝对时间更可靠。
    publishedAt: normalizedText(element.querySelector('.kr-flow-bar-time')) || undefined,
    previewBlocks: [
      ...(summary ? [summary] : []),
      ...(imageUrl ? [{
        type: 'gallery' as const,
        items: [{ url: imageUrl, alt: image?.getAttribute('alt') || title }],
      }] : []),
    ],
    metrics: [],
    actions: [{ id: 'open', kind: 'open', label: i18n.t('adapter.openOriginal'), enabled: true }],
  };
}

export class ThirtySixKrAdapter extends BaseAdapter {
  protected readonly cardSelector = CARD_SELECTOR;
  protected override readonly loadingStrategy = {
    kind: 'dom-control',
    selector: LOAD_MORE_SELECTOR,
  } as const;

  protected override getFeedChannelBindings(root: ParentNode): RuntimeFeedChannelBinding[] {
    return collectFeedChannelBindings(
      root,
      '.kr-information-channel > a[href]',
      new URL(window.location.href),
      {
        // 36Kr 把 active class 放在链接内部的 channel-item 上。
        isActive: (element) => element.querySelector('.channel-item.active') !== null,
      },
    );
  }

  parseCard(element: Element, context: FeedPageContext): FeedItem | null {
    return parseThirtySixKrCard(element, context.url);
  }

  triggerAction(itemId: string, actionId: string): boolean {
    void itemId;
    void actionId;
    return false;
  }
}

export const thirtySixKrAdapterDefinition: AdapterDefinition = {
  source: THIRTY_SIX_KR_SOURCE,
  matches: (url) => (
    url.hostname === '36kr.com' || url.hostname === 'www.36kr.com'
  ) && SUPPORTED_PATHS.has(url.pathname.replace(/\/+$/, '')),
  create: (onItems) => new ThirtySixKrAdapter(onItems),
};
