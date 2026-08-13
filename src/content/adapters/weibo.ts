import DOMPurify from 'dompurify';
import { WEIBO_PLATFORM } from '../../config/platforms';
import type {
  FeedActionDescriptor,
  FeedAuthor,
  FeedBlock,
  FeedImage,
  FeedItem,
  FeedItemSummary,
  FeedVideo,
} from '../../types/feed';
import { BaseAdapter, type AdapterDefinition } from './base';

/**
 * 微博同时维护新版 CSS Module 页面与仍带 action-type/node-type 的旧版页面。
 * 选择器优先使用语义属性，class 前缀只覆盖卡片、正文等结构边界。
 */
const CARD_SELECTOR = [
  '[action-type="feed_list_item"]',
  'article[data-testid="feed-card"]',
  '[data-testid="feed-card"]',
  '[class*="Feed_wrap_"]',
  'article.woo-panel-main[class*="_wrap_"]',
].join(', ');

const BODY_SELECTOR = [
  '[node-type="feed_list_content"]',
  '[data-testid="feed-content"]',
  '[class*="detail_wbtext_"]',
  '.wbpro-feed-ogText',
  '[class*="_wbtext_"]',
].join(', ');

const QUOTE_SELECTOR = [
  '[node-type="feed_list_reason"]',
  '[data-testid="feed-repost"]',
  '[class*="Feed_retweet_"]',
  '[class*="detail_repost_"]',
].join(', ');

const MEDIA_IMAGE_SELECTOR = [
  '[node-type="feed_list_media_prev"] img',
  '[data-testid="feed-picture"] img',
  '[class*="picture_pic_"] img',
  '[class*="Picture_pic_"] img',
  '[class*="Feed_picture_"] img',
  '.picture img.woo-picture-img',
  '.woo-picture-main img',
].join(', ');

const VIDEO_CONTAINER_SELECTOR = [
  '[node-type="feed_list_media_video"]',
  '[data-testid="feed-video"]',
  '[class*="Feed_video_"]',
  '[class*="video_box"]',
  '[class*="_videobox_"]',
].join(', ');

type WeiboActionId = 'react' | 'reply' | 'repost';

const ACTION_SELECTORS: Record<WeiboActionId, string[]> = {
  react: [
    '[action-type="fl_like"]',
    '[action-type="feed_list_like"]',
    '[data-testid="like"]',
    'button.woo-like-main',
    'button[aria-label*="赞"]',
    'button[title*="赞"]',
  ],
  reply: [
    '[action-type="fl_comment"]',
    '[action-type="feed_list_comment"]',
    '[data-testid="comment"]',
    'button[aria-label*="评论"]',
    'button[title*="评论"]',
  ],
  repost: [
    '[action-type="fl_forward"]',
    '[action-type="feed_list_forward"]',
    '[data-testid="repost"]',
    'button[aria-label*="转发"]',
    'button[title*="转发"]',
  ],
};

const ACTION_LABELS: Record<WeiboActionId, string[]> = {
  react: ['赞'],
  reply: ['评论'],
  repost: ['转发'],
};

const ACTION_ICON_SELECTORS: Record<WeiboActionId, string[]> = {
  react: ['.woo-font--like', '[class*="woo-font--like"]'],
  reply: ['.woo-font--comment', '[class*="woo-font--comment"]'],
  repost: ['.woo-font--retweet', '[class*="woo-font--retweet"]'],
};

const SOURCE = WEIBO_PLATFORM;

function absoluteUrl(value: string): string {
  if (!value) return '';
  try {
    return new URL(value, window.location.origin).href;
  } catch {
    return '';
  }
}

function stableHash(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function firstElement(element: Element, selectors: string[]): Element | null {
  for (const selector of selectors) {
    const match = element.querySelector(selector);
    if (match) return match;
  }
  return null;
}

function firstText(element: Element, selectors: string[]): string {
  return firstElement(element, selectors)?.textContent?.trim() || '';
}

function firstAttribute(element: Element, selectors: string[], attribute: string): string {
  for (const selector of selectors) {
    const value = element.querySelector(selector)?.getAttribute(attribute)?.trim();
    if (value) return value;
  }
  return '';
}

export function parseWeiboCount(value: string): number {
  const normalized = value.replace(/,/g, '').trim();
  const match = normalized.match(/(\d+(?:\.\d+)?)\s*([KMB万千亿]?)/i);
  if (!match) return 0;

  const multipliers: Record<string, number> = {
    K: 1_000,
    M: 1_000_000,
    B: 1_000_000_000,
    千: 1_000,
    万: 10_000,
    亿: 100_000_000,
  };
  const unit = match[2]?.toUpperCase() || '';
  return Math.round(Number(match[1]) * (multipliers[unit] || 1));
}

function findActionControl(element: Element, actionId: WeiboActionId): HTMLElement | null {
  for (const selector of ACTION_SELECTORS[actionId]) {
    const control = element.querySelector<HTMLElement>(selector);
    if (control && !control.closest(QUOTE_SELECTOR)) return control;
  }

  for (const selector of ACTION_ICON_SELECTORS[actionId]) {
    const icon = element.querySelector(selector);
    const control = icon?.closest<HTMLElement>(
      '[class*="toolbar_item_"], [class*="_item_"], button, [role="button"], a',
    );
    if (control && !control.closest(QUOTE_SELECTOR)) return control;
  }

  return Array.from(element.querySelectorAll<HTMLElement>('button, [role="button"], a'))
    .find((control) => {
      if (control.closest(QUOTE_SELECTOR)) return false;
      const label = [
        control.getAttribute('aria-label'),
        control.getAttribute('title'),
        control.textContent,
      ].filter(Boolean).join(' ');
      return ACTION_LABELS[actionId].some((keyword) => label.includes(keyword));
    }) || null;
}

function actionCount(element: Element, actionId: WeiboActionId): number {
  const control = findActionControl(element, actionId);
  if (!control) return 0;
  return parseWeiboCount([
    control.getAttribute('aria-label'),
    control.getAttribute('title'),
    control.textContent,
  ].filter(Boolean).join(' '));
}

function findOriginalUrl(element: Element): string {
  const link = firstElement(element, [
    '[class*="head-info_time_"] a[href]',
    '[node-type="feed_list_item_date"][href]',
    '[data-testid="feed-time"] a[href]',
    'a[href*="/detail/"]',
    'a[class*="_time_"][href]',
    'a[href*="weibo.com/"][title]',
  ]);
  return absoluteUrl(link?.getAttribute('href') || '');
}

function originIdFrom(element: Element, originalUrl: string, fallback: string): string {
  return element.getAttribute('mid') ||
    element.getAttribute('data-mid') ||
    element.getAttribute('data-id') ||
    originalUrl.match(/\/detail\/([A-Za-z0-9]+)/)?.[1] ||
    originalUrl.match(/\/(?:u\/)?\d+\/([A-Za-z0-9]+)/)?.[1] ||
    stableHash(fallback);
}

function getAuthor(element: Element): FeedAuthor {
  const authorLink = firstElement(element, [
    '[class*="head-info_nick_"][href]',
    '[data-testid="feed-author"][href]',
    '[nick-name][href]',
    '.WB_info a[nick-name]',
    'a[class*="_name_"][href*="/u/"]',
    'a[usercard][href]',
  ]);
  const name = authorLink?.textContent?.trim() || firstText(element, [
    '[class*="head-info_nick_"]',
    '[data-testid="feed-author"]',
    '[nick-name]',
    '.WB_info .W_f14',
    '[class*="_nick_"]',
    'a[class*="_name_"]',
  ]) || '微博用户';
  const avatar = firstAttribute(element, [
    '[class*="head-info_avatar_"] img',
    '[data-testid="feed-avatar"] img',
    '.woo-avatar-img',
    'img.W_face_radius',
  ], 'src');

  return {
    name,
    avatar: absoluteUrl(avatar),
    link: authorLink
      ? absoluteUrl(authorLink.getAttribute('href') || '') || undefined
      : undefined,
  };
}

function cleanFeedText(body: Element): { html: string; plainText: string } {
  const clone = body.cloneNode(true) as Element;
  clone.querySelectorAll(QUOTE_SELECTOR).forEach((node) => node.remove());
  clone.querySelectorAll('img[alt]').forEach((image) => {
    image.replaceWith(document.createTextNode(image.getAttribute('alt') || ''));
  });
  clone.querySelectorAll([
    'script',
    'style',
    'svg',
    'video',
    'button',
    '[node-type="feed_list_content_more"]',
    '[class*="expand_"]',
  ].join(', ')).forEach((node) => node.remove());
  clone.querySelectorAll('a').forEach((link) => {
    const href = absoluteUrl(link.getAttribute('href') || '');
    if (href) link.setAttribute('href', href);
    link.setAttribute('target', '_blank');
    link.setAttribute('rel', 'noreferrer');
  });
  clone.querySelectorAll('[style], [class], [id], [action-type], [node-type], [data-testid]')
    .forEach((node) => {
      node.removeAttribute('style');
      node.removeAttribute('class');
      node.removeAttribute('id');
      node.removeAttribute('action-type');
      node.removeAttribute('node-type');
      node.removeAttribute('data-testid');
    });

  const html = DOMPurify.sanitize(clone.innerHTML, {
    ALLOWED_TAGS: ['span', 'p', 'br', 'strong', 'b', 'em', 'i', 'a'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  });
  const textContainer = document.createElement('div');
  textContainer.innerHTML = html;
  return {
    html,
    plainText: textContainer.textContent?.replace(/\s+/g, ' ').trim() || '',
  };
}

function extractImages(element: Element): FeedImage[] {
  const seen = new Set<string>();
  return Array.from(element.querySelectorAll<HTMLImageElement>(MEDIA_IMAGE_SELECTOR))
    .filter((image) => !image.closest(QUOTE_SELECTOR) && !image.closest(VIDEO_CONTAINER_SELECTOR))
    .map((image) => ({
      url: absoluteUrl(
        image.getAttribute('data-original') ||
          image.getAttribute('data-src') ||
          image.getAttribute('src') ||
          '',
      ),
      alt: image.getAttribute('alt') || '',
    }))
    .filter((image) => {
      if (!image.url || seen.has(image.url)) return false;
      seen.add(image.url);
      return true;
    });
}

function extractVideo(element: Element): FeedVideo | undefined {
  const container = element.querySelector(VIDEO_CONTAINER_SELECTOR);
  const video = (container?.querySelector('video') || element.querySelector('video')) as
    HTMLVideoElement | null;
  if ((!container && !video) || container?.closest(QUOTE_SELECTOR) || video?.closest(QUOTE_SELECTOR)) {
    return undefined;
  }

  const posterImage = container?.querySelector('img');
  return {
    poster: absoluteUrl(
      video?.getAttribute('poster') ||
        posterImage?.getAttribute('data-src') ||
        posterImage?.getAttribute('src') ||
        '',
    ),
    url: absoluteUrl(
      video?.currentSrc ||
        video?.getAttribute('src') ||
        video?.querySelector('source')?.getAttribute('src') ||
        '',
    ) || undefined,
    alt: posterImage?.getAttribute('alt') || '微博视频',
  };
}

function extractQuote(element: Element, parentUrl: string): FeedItemSummary | undefined {
  const quote = element.querySelector(QUOTE_SELECTOR);
  if (!quote) return undefined;

  const body = quote.querySelector(BODY_SELECTOR);
  const text = body ? cleanFeedText(body).plainText : quote.textContent?.trim() || '';
  const originalUrl = findOriginalUrl(quote) || parentUrl;
  const author = getAuthor(quote);
  return {
    id: `weibo_${originIdFrom(quote, originalUrl, `${originalUrl}|${author.name}|${text}`)}`,
    originalUrl,
    author,
    text: text || undefined,
  };
}

function isActive(control: HTMLElement | null): boolean {
  if (!control) return false;
  if (control.getAttribute('aria-pressed') === 'true' || control.dataset.active === 'true') {
    return true;
  }
  return /(^|[\s_-])(cur|active|liked)([\s_-]|$)/i.test(control.className);
}

export function parseWeiboCard(element: Element): FeedItem | null {
  const body = element.querySelector(BODY_SELECTOR);
  const text = body ? cleanFeedText(body) : { html: '', plainText: '' };
  const images = extractImages(element);
  const video = extractVideo(element);
  const originalUrl = findOriginalUrl(element) || window.location.href;
  const quote = extractQuote(element, originalUrl);
  if (!text.plainText && !images.length && !video && !quote) return null;

  const author = getAuthor(element);
  const likes = actionCount(element, 'react');
  const replies = actionCount(element, 'reply');
  const reposts = actionCount(element, 'repost');
  const publishedAt = firstAttribute(element, [
    'time',
    '[node-type="feed_list_item_date"]',
    '[data-testid="feed-time"]',
    '[class*="head-info_time_"] a',
    'a[class*="_time_"]',
  ], 'datetime') || firstAttribute(element, [
    '[node-type="feed_list_item_date"]',
    '[data-testid="feed-time"]',
    '[class*="head-info_time_"] a',
    'a[class*="_time_"]',
  ], 'title') || undefined;
  const originId = originIdFrom(
    element,
    originalUrl,
    `${originalUrl}|${author.name}|${publishedAt || ''}|${text.plainText}|${images[0]?.url || ''}`,
  );
  const blocks: FeedBlock[] = [
    ...(text.plainText ? [{
      type: 'richText' as const,
      html: text.html,
      plainText: text.plainText,
    }] : []),
    ...(images.length ? [{ type: 'gallery' as const, items: images }] : []),
    ...(video ? [{ type: 'video' as const, media: video }] : []),
    ...(quote ? [{ type: 'quote' as const, item: quote }] : []),
  ];
  const actions: FeedActionDescriptor[] = [
    {
      id: 'repost',
      kind: 'repost',
      label: '转发',
      count: reposts,
      enabled: true,
      fallback: 'openOriginal',
    },
    {
      id: 'reply',
      kind: 'reply',
      label: '评论',
      count: replies,
      enabled: true,
      fallback: 'openOriginal',
    },
    {
      id: 'react',
      kind: 'react',
      variant: 'like',
      label: '赞',
      count: likes,
      active: isActive(findActionControl(element, 'react')),
      enabled: true,
      fallback: 'openOriginal',
    },
    { id: 'open', kind: 'open', label: '查看原文', enabled: true },
  ];

  return {
    id: `weibo_${originId}`,
    platform: 'weibo',
    source: SOURCE,
    originalUrl,
    kind: 'post',
    role: 'post',
    author,
    context: quote ? {
      reason: {
        type: 'repost',
        label: '转发了这条微博',
        actor: author,
      },
    } : undefined,
    publishedAt,
    previewBlocks: blocks,
    metrics: [
      { kind: 'reposts', value: reposts, label: '转发' },
      { kind: 'replies', value: replies, label: '评论' },
      { kind: 'reactions', value: likes, label: '赞' },
    ],
    actions,
  };
}

export function triggerWeiboAction(element: Element | undefined, actionId: string): boolean {
  if (!element || !Object.hasOwn(ACTION_SELECTORS, actionId)) return false;
  const control = findActionControl(element, actionId as WeiboActionId);
  if (!control) return false;
  control.click();
  return true;
}

export class WeiboAdapter extends BaseAdapter {
  protected readonly cardSelector = CARD_SELECTOR;

  parseCard(element: Element): FeedItem | null {
    return parseWeiboCard(element);
  }

  triggerAction(itemId: string, actionId: string): boolean {
    return triggerWeiboAction(this.getRuntimeElement(itemId), actionId);
  }

  protected override getCards(root: ParentNode): Element[] {
    // 引用微博可能复用卡片结构，只将最外层 Feed 卡片注册为独立项目。
    return super.getCards(root).filter((card) => !card.parentElement?.closest(CARD_SELECTOR));
  }
}

function isRedirectedFeedRoute(url: URL): boolean {
  if (url.pathname !== '/newlogin' || url.searchParams.get('tabtype') !== 'weibo') return false;
  try {
    const target = new URL(url.searchParams.get('url') || '');
    return target.hostname === 'weibo.com' || target.hostname === 'www.weibo.com';
  } catch {
    return false;
  }
}

export const weiboAdapterDefinition: AdapterDefinition = {
  source: SOURCE,
  matches: (url) => ['weibo.com', 'www.weibo.com'].includes(url.hostname) && (
    ['/', '/hot', '/mygroups'].includes(url.pathname) ||
    url.pathname.startsWith('/hot/') ||
    isRedirectedFeedRoute(url)
  ),
  create: (onItems) => new WeiboAdapter(onItems),
};
