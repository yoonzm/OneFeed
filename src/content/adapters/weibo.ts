import DOMPurify from 'dompurify';
import { WEIBO_PLATFORM } from '../../config/platforms';
import { i18n } from '../../i18n';
import type { FeedBlock, FeedImage, FeedItem, FeedMetric, FeedVideo } from '../../types/feed';
import {
  BaseAdapter,
  type AdapterDefinition,
  type FeedPageContext,
} from './base';

const CARD_SELECTOR = 'main article';
const SUPPORTED_HOSTS = new Set(['weibo.com', 'www.weibo.com']);

export const WEIBO_SOURCE = WEIBO_PLATFORM;

function absoluteUrl(value: string, pageUrl: URL): string {
  if (!value) return '';
  try {
    return new URL(value, pageUrl).href;
  } catch {
    return '';
  }
}

function normalizedText(element: Element | null | undefined): string {
  return element?.textContent?.replace(/\s+/g, ' ').trim() || '';
}

export function parseWeiboCount(value: string): number {
  const match = value.replace(/,/g, '').trim().match(/(\d+(?:\.\d+)?)\s*([万亿千]?)/);
  if (!match) return 0;
  const multipliers: Record<string, number> = {
    千: 1_000,
    万: 10_000,
    亿: 100_000_000,
  };
  return Math.round(Number(match[1]) * (multipliers[match[2] || ''] || 1));
}

function createRichTextBlock(element: Element, pageUrl: URL): FeedBlock | null {
  const clone = element.cloneNode(true) as Element;
  clone.querySelectorAll('.expand, script, style, noscript, button, svg, video')
    .forEach((node) => node.remove());
  clone.querySelectorAll<HTMLImageElement>('img').forEach((image) => {
    const src = absoluteUrl(image.getAttribute('src') || '', pageUrl);
    const alt = image.getAttribute('alt') || '';
    if (!src || !alt) {
      image.remove();
      return;
    }
    image.setAttribute('src', src);
    image.setAttribute('loading', 'lazy');
    image.setAttribute('data-onefeed-kind', 'emoji');
  });
  clone.querySelectorAll('a[href]').forEach((anchor) => {
    const href = absoluteUrl(anchor.getAttribute('href') || '', pageUrl);
    if (!href) {
      anchor.replaceWith(...Array.from(anchor.childNodes));
      return;
    }
    anchor.setAttribute('href', href);
    anchor.setAttribute('target', '_blank');
    anchor.setAttribute('rel', 'noreferrer');
  });
  clone.querySelectorAll('*').forEach((node) => {
    Array.from(node.attributes).forEach((attribute) => {
      if (![
        'href', 'target', 'rel', 'src', 'alt', 'loading', 'data-onefeed-kind',
      ].includes(attribute.name)) {
        node.removeAttribute(attribute.name);
      }
    });
  });

  const html = DOMPurify.sanitize(clone.innerHTML, {
    ALLOWED_TAGS: [
      'p', 'br', 'div', 'span', 'strong', 'b', 'em', 'i', 'u', 's',
      'blockquote', 'ol', 'ul', 'li', 'a', 'code', 'pre', 'img',
    ],
    ALLOWED_ATTR: [
      'href', 'target', 'rel', 'src', 'alt', 'loading', 'data-onefeed-kind',
    ],
  });
  const textContainer = document.createElement('div');
  textContainer.innerHTML = html;
  textContainer.querySelectorAll('img[data-onefeed-kind="emoji"]').forEach((image) => {
    image.replaceWith(document.createTextNode(image.getAttribute('alt') || ''));
  });
  const plainText = normalizedText(textContainer);
  return plainText ? { type: 'richText', html, plainText } : null;
}

function findPostBody(element: Element): Element | null {
  const wrapper = element.querySelector('.wbpro-feed-ogText');
  if (!wrapper) return null;
  return Array.from(wrapper.children).find((child) => normalizedText(child)) || wrapper;
}

function extractImages(element: Element, pageUrl: URL): FeedImage[] {
  const seen = new Set<string>();
  return Array.from(element.querySelectorAll<HTMLImageElement>(
    '.wbpro-feed-content .picture img[src], .wbpro-feed-content .woo-picture-img[src]',
  )).map((image) => ({
    url: absoluteUrl(image.getAttribute('src') || '', pageUrl),
    alt: image.getAttribute('alt') || '',
  })).filter((image) => {
    if (!image.url || seen.has(image.url)) return false;
    seen.add(image.url);
    return true;
  });
}

function parseDuration(value: string): number | undefined {
  const parts = value.trim().split(':').map(Number);
  if (!parts.length || parts.some((part) => !Number.isFinite(part))) return undefined;
  return parts.reduce((total, part) => total * 60 + part, 0);
}

function extractVideos(element: Element, pageUrl: URL): FeedVideo[] {
  const seen = new Set<string>();
  return Array.from(element.querySelectorAll<HTMLVideoElement>('.wbpro-feed-content video'))
    .map((video) => {
      const container = video.closest('.video-js') || video.parentElement;
      const posterElement = container?.querySelector<HTMLImageElement>('.vjs-poster img[src]');
      const poster = absoluteUrl(
        video.getAttribute('poster') || posterElement?.getAttribute('src') || '',
        pageUrl,
      );
      return {
        poster,
        url: absoluteUrl(video.getAttribute('src') || '', pageUrl) || undefined,
        durationSeconds: parseDuration(
          normalizedText(container?.querySelector('.vjs-duration-display')),
        ),
      };
    })
    .filter((video) => {
      if (!video.poster || seen.has(video.poster)) return false;
      seen.add(video.poster);
      return true;
    });
}

function findPermalink(element: Element, pageUrl: URL): HTMLAnchorElement | undefined {
  return Array.from(element.querySelectorAll<HTMLAnchorElement>('header a[href]')).find((anchor) => {
    const href = absoluteUrl(anchor.getAttribute('href') || '', pageUrl);
    if (!href) return false;
    const url = new URL(href);
    return /^\/\d+\/[A-Za-z0-9]+\/?$/.test(url.pathname);
  });
}

function createMetrics(element: Element): FeedMetric[] {
  const values = (element.querySelector('footer[aria-label]')?.getAttribute('aria-label') || '')
    .split(',')
    .map((value) => parseWeiboCount(value));
  const [reposts = 0, replies = 0, reactions = 0] = values;
  const viewMatch = normalizedText(element.querySelector('.wbpro-feed-content'))
    .match(/([\d.万亿千]+)\s*次观看/);
  const views = parseWeiboCount(viewMatch?.[1] || '');

  return [
    { kind: 'reposts', value: reposts, label: i18n.t('adapter.repost') },
    { kind: 'replies', value: replies, label: i18n.t('adapter.comments') },
    { kind: 'reactions', value: reactions, label: i18n.t('adapter.reactions') },
    ...(views ? [{ kind: 'views' as const, value: views, label: i18n.t('adapter.views') }] : []),
  ];
}

export function parseWeiboCard(
  element: Element,
  pageUrl = new URL(window.location.href),
): FeedItem | null {
  const permalink = findPermalink(element, pageUrl);
  const originalUrl = absoluteUrl(permalink?.getAttribute('href') || '', pageUrl);
  const originId = originalUrl ? new URL(originalUrl).pathname.split('/').filter(Boolean).at(-1) : '';
  // 推荐广告与辅助 article 通常没有形如 /<uid>/<mid> 的微博永久链接。
  if (!originId || !originalUrl) return null;

  const authorLink = element.querySelector<HTMLAnchorElement>('header a[usercard][href]') ||
    element.querySelector<HTMLAnchorElement>('header a[aria-label][href*="/u/"]');
  const body = findPostBody(element);
  const richText = body ? createRichTextBlock(body, pageUrl) : null;
  const images = extractImages(element, pageUrl);
  const videos = extractVideos(element, pageUrl);
  const previewBlocks: FeedBlock[] = [
    ...(richText ? [richText] : []),
    ...(images.length ? [{ type: 'gallery' as const, items: images }] : []),
    ...videos.map((media) => ({ type: 'video' as const, media })),
  ];
  if (!previewBlocks.length) return null;

  const metrics = createMetrics(element);
  const reactions = metrics.find((metric) => metric.kind === 'reactions')?.value || 0;
  const likeControl = element.querySelector<HTMLButtonElement>('button.woo-like-main');
  const likeLabel = [
    likeControl?.getAttribute('title'),
    likeControl?.getAttribute('aria-label'),
  ].filter(Boolean).join(' ');

  return {
    id: `weibo_${originId}`,
    platform: 'weibo',
    source: WEIBO_SOURCE,
    originalUrl,
    kind: 'post',
    role: 'post',
    author: {
      name: normalizedText(authorLink) || authorLink?.getAttribute('aria-label') || '',
      avatar: absoluteUrl(
        element.querySelector<HTMLImageElement>('header .woo-avatar-img[src]')
          ?.getAttribute('src') || '',
        pageUrl,
      ),
      link: authorLink
        ? absoluteUrl(authorLink.getAttribute('href') || '', pageUrl) || undefined
        : undefined,
    },
    publishedAt: permalink?.getAttribute('title') || normalizedText(permalink) || undefined,
    previewBlocks,
    metrics,
    actions: [
      {
        id: 'react',
        kind: 'react',
        variant: 'like',
        label: i18n.t('adapter.reactions'),
        count: reactions,
        active: likeLabel.includes('取消') || likeControl?.getAttribute('aria-pressed') === 'true',
        enabled: Boolean(likeControl),
        fallback: 'openOriginal',
      },
      { id: 'open', kind: 'open', label: i18n.t('adapter.openPost'), enabled: true },
    ],
  };
}

export function triggerWeiboAction(element: Element | undefined, actionId: string): boolean {
  if (actionId !== 'react') return false;
  const control = element?.querySelector<HTMLButtonElement>('button.woo-like-main');
  if (!control) return false;
  control.click();
  return true;
}

export class WeiboAdapter extends BaseAdapter {
  protected readonly cardSelector = CARD_SELECTOR;

  parseCard(element: Element, context: FeedPageContext): FeedItem | null {
    return parseWeiboCard(element, context.url);
  }

  triggerAction(itemId: string, actionId: string): boolean {
    return triggerWeiboAction(this.getRuntimeElement(itemId), actionId);
  }
}

function isSupportedPath(url: URL): boolean {
  const path = url.pathname.replace(/\/+$/, '') || '/';
  if (path === '/') return true;
  if (path !== '/newlogin') return false;
  const tabType = url.searchParams.get('tabtype');
  return !tabType || tabType === 'weibo';
}

export const weiboAdapterDefinition: AdapterDefinition = {
  source: WEIBO_SOURCE,
  matches: (url) => SUPPORTED_HOSTS.has(url.hostname) && isSupportedPath(url),
  create: (onItems) => new WeiboAdapter(onItems),
};
