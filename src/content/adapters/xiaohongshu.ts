import { XIAOHONGSHU_PLATFORM } from '../../config/platforms';
import type {
  FeedActionDescriptor,
  FeedAuthor,
  FeedBlock,
  FeedImage,
  FeedItem,
  FeedVideo,
} from '../../types/feed';
import { BaseAdapter, type AdapterDefinition } from './base';

/**
 * 小红书发现页的卡片由瀑布流 section.note-item 承载。
 * data-note-id 和 footer 内的语义 class 比构建时生成的 data-v-* 属性更稳定。
 */
const CARD_SELECTOR = 'section.note-item';
const NOTE_LINK_SELECTOR = 'a.cover[href], a.title[href], a[href^="/explore/"]';
const LIKE_SELECTOR = '.like-wrapper';

const SOURCE = XIAOHONGSHU_PLATFORM;

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

function positiveNumber(...values: Array<string | null | undefined>): number | undefined {
  for (const value of values) {
    const number = Number(value);
    if (Number.isFinite(number) && number > 0) return number;
  }
  return undefined;
}

export function parseXiaohongshuCount(value: string): number {
  const normalized = value.replace(/,/g, '').trim();
  const match = normalized.match(/(\d+(?:\.\d+)?)\s*([KMB万千亿]?)/i);
  if (!match) return 0;

  const multipliers: Record<string, number> = {
    K: 1_000,
    M: 1_000_000,
    B: 1_000_000_000,
    '千': 1_000,
    '万': 10_000,
    '亿': 100_000_000,
  };
  const unit = match[2]?.toUpperCase() || '';
  return Math.round(Number(match[1]) * (multipliers[unit] || 1));
}

function getOriginalUrl(element: Element): string {
  const href = element.querySelector(NOTE_LINK_SELECTOR)?.getAttribute('href') || '';
  return absoluteUrl(href) || window.location.href;
}

function getOriginId(element: Element, originalUrl: string, fallback: string): string {
  return element.getAttribute('data-note-id') ||
    element.getAttribute('data-id') ||
    originalUrl.match(/\/(?:explore|discovery\/item)\/([^/?#]+)/)?.[1] ||
    stableHash(fallback);
}

function getAuthor(element: Element): FeedAuthor {
  const authorLink = element.querySelector<HTMLAnchorElement>('a.author[href]');
  const name = element.querySelector('.author .name, .author-wrapper .name')
    ?.textContent?.trim() || authorLink?.textContent?.trim() || '小红书用户';
  const avatarValue = element.querySelector<HTMLImageElement>(
    '.author-avatar, .author-wrapper img',
  )?.getAttribute('src') || '';

  return {
    name,
    avatar: absoluteUrl(avatarValue),
    link: authorLink ? absoluteUrl(authorLink.getAttribute('href') || '') || undefined : undefined,
  };
}

function imageDimensions(element: Element, image: HTMLImageElement): {
  width?: number;
  height?: number;
  aspectRatio?: number;
} {
  const width = positiveNumber(
    image.getAttribute('width'),
    image.dataset.width,
    element.getAttribute('data-width'),
  );
  const height = positiveNumber(
    image.getAttribute('height'),
    image.dataset.height,
    element.getAttribute('data-height'),
  );
  return {
    width,
    height,
    aspectRatio: width && height ? width / height : undefined,
  };
}

function extractImages(element: Element, title: string): FeedImage[] {
  const seen = new Set<string>();
  return Array.from(element.querySelectorAll<HTMLImageElement>('.cover img'))
    .map((image) => {
      const url = absoluteUrl(
        image.getAttribute('data-original') ||
          image.getAttribute('data-src') ||
          image.getAttribute('src') ||
          '',
      );
      return {
        url,
        alt: image.getAttribute('alt') || title || '小红书笔记封面',
        ...imageDimensions(element, image),
      };
    })
    .filter((image) => {
      if (!image.url || seen.has(image.url)) return false;
      seen.add(image.url);
      return true;
    });
}

function isVideoCard(element: Element): boolean {
  if (element.querySelector('.play-icon, [data-note-type="video"]')) return true;
  return Array.from(element.querySelectorAll('use')).some((icon) => (
    /#(?:play-s|play)$/.test(
      icon.getAttribute('href') || icon.getAttribute('xlink:href') || '',
    )
  ));
}

function extractVideo(element: Element, image: FeedImage | undefined): FeedVideo | undefined {
  if (!isVideoCard(element)) return undefined;
  return {
    poster: image?.url || '',
    alt: image?.alt || '小红书视频封面',
    aspectRatio: image?.aspectRatio,
  };
}

function findLikeControl(element: Element): HTMLElement | null {
  return element.querySelector<HTMLElement>(LIKE_SELECTOR);
}

function isLikeActive(control: HTMLElement | null): boolean {
  if (!control) return false;
  if (control.getAttribute('aria-pressed') === 'true' || control.dataset.liked === 'true') {
    return true;
  }
  return Array.from(control.querySelectorAll('use')).some((icon) => (
    /#(?:liked|like-fill|like-active)$/.test(
      icon.getAttribute('href') || icon.getAttribute('xlink:href') || '',
    )
  ));
}

export function parseXiaohongshuCard(element: Element): FeedItem | null {
  const title = element.querySelector('.title')?.textContent?.trim() || '';
  const images = extractImages(element, title);
  const video = extractVideo(element, images[0]);
  if (!title && !images.length && !video) return null;

  const originalUrl = getOriginalUrl(element);
  const author = getAuthor(element);
  const likeControl = findLikeControl(element);
  const likes = parseXiaohongshuCount(
    likeControl?.querySelector('.count')?.textContent || likeControl?.textContent || '',
  );
  const originId = getOriginId(
    element,
    originalUrl,
    `${originalUrl}|${author.name}|${title}|${images[0]?.url || ''}`,
  );
  const blocks: FeedBlock[] = video
    ? [{ type: 'video', media: video }]
    : images.length
      ? [{ type: 'gallery', items: images }]
      : [];
  const actions: FeedActionDescriptor[] = [];
  if (likeControl) {
    actions.push({
      id: 'react',
      kind: 'react',
      variant: 'like',
      label: '喜欢',
      count: likes,
      active: isLikeActive(likeControl),
      enabled: true,
      fallback: 'openOriginal',
    });
  }
  // Feed 卡片不暴露稳定的收藏控件，交回原笔记完成收藏；商品卡也沿用此安全回退。
  actions.push(
    {
      id: 'bookmark',
      kind: 'bookmark',
      label: '收藏（原站）',
      enabled: true,
      fallback: 'openOriginal',
    },
    { id: 'open', kind: 'open', label: '查看原文', enabled: true },
  );

  return {
    id: `xiaohongshu_${originId}`,
    platform: 'xiaohongshu',
    source: SOURCE,
    originalUrl,
    kind: 'post',
    role: 'post',
    title: title || undefined,
    author,
    previewBlocks: blocks,
    metrics: likeControl ? [{ kind: 'reactions', value: likes, label: '喜欢' }] : [],
    actions,
  };
}

export function triggerXiaohongshuAction(
  element: Element | undefined,
  actionId: string,
): boolean {
  if (!element || actionId !== 'react') return false;
  const control = findLikeControl(element);
  if (!control) return false;
  control.click();
  return true;
}

export class XiaohongshuAdapter extends BaseAdapter {
  protected readonly cardSelector = CARD_SELECTOR;

  parseCard(element: Element): FeedItem | null {
    return parseXiaohongshuCard(element);
  }

  triggerAction(itemId: string, actionId: string): boolean {
    return triggerXiaohongshuAction(this.getRuntimeElement(itemId), actionId);
  }
}

export const xiaohongshuAdapterDefinition: AdapterDefinition = {
  source: SOURCE,
  matches: (url) => ['xiaohongshu.com', 'www.xiaohongshu.com'].includes(url.hostname) && (
    url.pathname === '/' || /^\/explore\/?$/.test(url.pathname)
  ),
  create: (onItems) => new XiaohongshuAdapter(onItems),
};
