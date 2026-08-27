import DOMPurify from 'dompurify';
import { TWITTER_PLATFORM } from '../../config/platforms';
import { i18n } from '../../i18n';
import type {
  FeedActionDescriptor,
  FeedBlock,
  FeedImage,
  FeedItem,
  FeedMetric,
  FeedVideo,
} from '../../types/feed';
import {
  BaseAdapter,
  collectFeedChannelBindings,
  type AdapterDefinition,
  type FeedPageContext,
  type RuntimeFeedChannelBinding,
} from './base';

const CARD_SELECTOR = 'article[data-testid="tweet"]';
const SUPPORTED_HOSTS = new Set([
  'x.com',
  'www.x.com',
  'twitter.com',
  'www.twitter.com',
  'mobile.twitter.com',
]);
const SUPPORTED_PATHS = new Set(['/home']);

type TwitterActionId = 'reply' | 'repost' | 'like' | 'bookmark';

const ACTION_SELECTORS: Record<TwitterActionId, string> = {
  reply: 'button[data-testid="reply"]',
  repost: 'button[data-testid="retweet"], button[data-testid="unretweet"]',
  like: 'button[data-testid="like"], button[data-testid="unlike"]',
  bookmark: 'button[data-testid="bookmark"], button[data-testid="removeBookmark"]',
};

export const TWITTER_SOURCE = TWITTER_PLATFORM;

function absoluteUrl(value: string, pageUrl: URL): string {
  if (!value) return '';
  try {
    return new URL(value, pageUrl).href;
  } catch {
    return '';
  }
}

/** X 的 data-testid 比构建时生成的 class 稳定；同时排除未来可能嵌套的推文节点。 */
function ownedElements<T extends Element>(element: Element, selector: string): T[] {
  return Array.from(element.querySelectorAll<T>(selector))
    .filter((candidate) => candidate.closest(CARD_SELECTOR) === element);
}

function firstOwned<T extends Element>(element: Element, selector: string): T | undefined {
  return ownedElements<T>(element, selector)[0];
}

export function parseTwitterCount(value: string): number {
  const match = value.replace(/\u00a0/g, ' ').match(/(\d[\d,.]*)\s*([KMB万千]?)/i);
  if (!match) return 0;

  const [, rawCount = '0', rawSuffix = ''] = match;
  const suffix = rawSuffix.toUpperCase();
  const numeric = suffix
    ? Number(rawCount.replace(',', '.'))
    : Number(rawCount.replace(/[,.]/g, ''));
  if (!Number.isFinite(numeric)) return 0;

  const multiplier = suffix === 'K' || suffix === '千'
    ? 1_000
    : suffix === 'M'
      ? 1_000_000
      : suffix === 'B'
        ? 1_000_000_000
        : suffix === '万'
          ? 10_000
          : 1;
  return Math.round(numeric * multiplier);
}

function controlCount(control: Element | undefined): number {
  if (!control) return 0;
  return parseTwitterCount([
    control.getAttribute('aria-label'),
    control.textContent,
  ].filter(Boolean).join(' '));
}

function preserveLineBreaks(root: Node): void {
  Array.from(root.childNodes).forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE && child.textContent?.includes('\n')) {
      const fragment = document.createDocumentFragment();
      child.textContent.split('\n').forEach((part, index) => {
        if (index) fragment.appendChild(document.createElement('br'));
        if (part) fragment.appendChild(document.createTextNode(part));
      });
      child.replaceWith(fragment);
      return;
    }
    preserveLineBreaks(child);
  });
}

function createRichTextBlock(body: Element, pageUrl: URL): FeedBlock | null {
  const clone = body.cloneNode(true) as Element;
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
  clone.querySelectorAll('img, svg, button, script, style, noscript')
    .forEach((node) => node.remove());
  clone.querySelectorAll('*').forEach((node) => {
    Array.from(node.attributes).forEach((attribute) => {
      if (!['href', 'target', 'rel'].includes(attribute.name)) {
        node.removeAttribute(attribute.name);
      }
    });
  });
  const plainText = clone.textContent?.trim() || '';
  if (!plainText) return null;
  preserveLineBreaks(clone);

  const html = DOMPurify.sanitize(clone.innerHTML, {
    ALLOWED_TAGS: ['span', 'a', 'br'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  });
  return { type: 'richText', html, plainText };
}

function extractImages(element: Element, pageUrl: URL, videoPosters: Set<string>): FeedImage[] {
  const seen = new Set<string>();
  return ownedElements<HTMLImageElement>(element, '[data-testid="tweetPhoto"] img[src]')
    .map((image) => ({
      url: absoluteUrl(image.getAttribute('src') || '', pageUrl),
      alt: image.getAttribute('alt') || '',
    }))
    .filter((image) => {
      if (!image.url || videoPosters.has(image.url) || seen.has(image.url)) return false;
      seen.add(image.url);
      return true;
    });
}

function extractVideos(element: Element, pageUrl: URL): FeedVideo[] {
  const seen = new Set<string>();
  return ownedElements<HTMLVideoElement>(element, 'video[poster]')
    .map((video) => ({
      poster: absoluteUrl(video.getAttribute('poster') || '', pageUrl),
      alt: video.getAttribute('aria-label') || undefined,
    }))
    .filter((video) => {
      if (!video.poster || seen.has(video.poster)) return false;
      seen.add(video.poster);
      return true;
    });
}

interface TwitterLinkPreview {
  block: Extract<FeedBlock, { type: 'linkPreview' }>;
  image?: FeedImage;
}

function extractLinkPreview(element: Element, pageUrl: URL): TwitterLinkPreview | null {
  const card = firstOwned<HTMLElement>(element, '[data-testid="card.wrapper"]');
  if (!card) return null;

  const link = card.closest<HTMLAnchorElement>('a[href]') || card.querySelector<HTMLAnchorElement>('a[href]');
  const url = absoluteUrl(link?.getAttribute('href') || '', pageUrl);
  if (!url) return null;

  const title = card.textContent?.replace(/\s+/g, ' ').trim() || undefined;
  const image = card.querySelector<HTMLImageElement>('img[src]');
  const imageUrl = absoluteUrl(image?.getAttribute('src') || '', pageUrl) || undefined;
  return {
    block: {
      type: 'linkPreview',
      preview: { url, title },
    },
    image: imageUrl ? { url: imageUrl, alt: title || '' } : undefined,
  };
}

function findActionControl(
  element: Element | undefined,
  actionId: TwitterActionId,
): HTMLButtonElement | undefined {
  if (!element) return undefined;
  return firstOwned<HTMLButtonElement>(element, ACTION_SELECTORS[actionId]);
}

export function parseTwitterCard(
  element: Element,
  pageUrl = new URL(window.location.href),
): FeedItem | null {
  const time = firstOwned<HTMLTimeElement>(element, 'a[href*="/status/"] time[datetime]');
  const permalink = time?.closest<HTMLAnchorElement>('a[href*="/status/"]');
  const originalUrl = absoluteUrl(permalink?.getAttribute('href') || '', pageUrl);
  const originId = originalUrl.match(/\/status\/(\d+)/)?.[1];
  // 推广卡片通常没有时间永久链接；不使用广告分析链接充当内容 ID。
  if (!time || !originalUrl || !originId) return null;

  const userName = firstOwned<HTMLElement>(element, '[data-testid="User-Name"]');
  const authorLink = userName?.querySelector<HTMLAnchorElement>('a[href]');
  const authorName = authorLink?.textContent?.replace(/\s+/g, ' ').trim() || '';
  const avatar = firstOwned<HTMLImageElement>(
    element,
    '[data-testid="Tweet-User-Avatar"] img[src]',
  );
  const tweetText = firstOwned<HTMLElement>(element, '[data-testid="tweetText"]');
  const videos = extractVideos(element, pageUrl);
  const videoPosters = new Set(videos.map((video) => video.poster));
  const images = extractImages(element, pageUrl, videoPosters);
  const linkPreview = extractLinkPreview(element, pageUrl);
  const previewBlocks: FeedBlock[] = [];
  if (tweetText) {
    const richText = createRichTextBlock(tweetText, pageUrl);
    const linkTitle = linkPreview?.block.preview.title
      ?.replace(/\s+/g, ' ').trim().toLocaleLowerCase();
    const bodyText = richText?.type === 'richText'
      ? richText.plainText.replace(/\s+/g, ' ').trim().toLocaleLowerCase()
      : '';
    if (richText && (!linkTitle || bodyText !== linkTitle)) previewBlocks.push(richText);
  }
  const linkPreviewImage = linkPreview?.image;
  if (linkPreviewImage && !images.some((image) => image.url === linkPreviewImage.url)) {
    images.push(linkPreviewImage);
  }
  if (images.length) previewBlocks.push({ type: 'gallery', items: images });
  videos.forEach((media) => previewBlocks.push({ type: 'video', media }));
  if (linkPreview) previewBlocks.push(linkPreview.block);
  if (!previewBlocks.length) return null;

  const replyControl = findActionControl(element, 'reply');
  const repostControl = findActionControl(element, 'repost');
  const likeControl = findActionControl(element, 'like');
  const bookmarkControl = findActionControl(element, 'bookmark');
  const viewsControl = firstOwned<HTMLAnchorElement>(element, 'a[href$="/analytics"][aria-label]');
  const replies = controlCount(replyControl);
  const reposts = controlCount(repostControl);
  const likes = controlCount(likeControl);
  const views = controlCount(viewsControl);
  const metrics: FeedMetric[] = [
    ...(replyControl ? [{ kind: 'replies' as const, value: replies, label: i18n.t('metric.replies') }] : []),
    ...(repostControl ? [{ kind: 'reposts' as const, value: reposts, label: i18n.t('metric.reposts') }] : []),
    ...(likeControl ? [{ kind: 'reactions' as const, value: likes, label: i18n.t('metric.reactions') }] : []),
    ...(viewsControl ? [{ kind: 'views' as const, value: views, label: i18n.t('metric.views') }] : []),
  ];
  const actions: FeedActionDescriptor[] = [
    ...(replyControl ? [{
      id: 'reply',
      kind: 'reply' as const,
      label: i18n.t('adapter.reply'),
      count: replies,
      enabled: true,
      fallback: 'openOriginal' as const,
    }] : []),
    ...(repostControl ? [{
      id: 'repost',
      kind: 'repost' as const,
      label: i18n.t('adapter.repost'),
      count: reposts,
      active: repostControl.dataset.testid === 'unretweet',
      enabled: true,
      fallback: 'openOriginal' as const,
    }] : []),
    ...(likeControl ? [{
      id: 'like',
      kind: 'react' as const,
      variant: 'like' as const,
      label: i18n.t('adapter.like'),
      count: likes,
      active: likeControl.dataset.testid === 'unlike',
      enabled: true,
      fallback: 'openOriginal' as const,
    }] : []),
    ...(bookmarkControl ? [{
      id: 'bookmark',
      kind: 'bookmark' as const,
      label: i18n.t('adapter.bookmark'),
      active: bookmarkControl.dataset.testid === 'removeBookmark',
      enabled: true,
      fallback: 'openOriginal' as const,
    }] : []),
    { id: 'open', kind: 'open', label: i18n.t('adapter.openPost'), enabled: true },
  ];
  const socialContext = firstOwned<HTMLElement>(element, '[data-testid="socialContext"]')
    ?.textContent?.replace(/\s+/g, ' ').trim();
  const pinned = Boolean(socialContext && /pinned|置顶/i.test(socialContext));

  return {
    id: `twitter_${originId}`,
    platform: 'twitter',
    source: TWITTER_SOURCE,
    originalUrl,
    kind: 'post',
    role: 'post',
    author: {
      name: authorName,
      avatar: absoluteUrl(avatar?.getAttribute('src') || '', pageUrl),
      link: absoluteUrl(authorLink?.getAttribute('href') || '', pageUrl) || undefined,
    },
    context: socialContext ? {
      reason: {
        type: /repost|retweeted|转发/i.test(socialContext)
          ? 'repost'
          : pinned
            ? 'pinned'
            : 'recommended',
        label: socialContext,
      },
    } : undefined,
    publishedAt: time.getAttribute('datetime') || undefined,
    previewBlocks,
    metrics,
    actions,
    flags: pinned ? { pinned: true } : undefined,
  };
}

export function triggerTwitterAction(
  element: Element | undefined,
  actionId: string,
): boolean {
  if (!Object.hasOwn(ACTION_SELECTORS, actionId)) return false;
  // 回复与转发会打开原站弹层/二次确认；原 DOM 被遮罩时回退到原帖更可靠。
  if (actionId === 'reply' || actionId === 'repost') return false;
  const control = findActionControl(element, actionId as TwitterActionId);
  if (!control) return false;
  control.click();
  return true;
}

export class TwitterAdapter extends BaseAdapter {
  protected readonly cardSelector = CARD_SELECTOR;

  protected override getFeedChannelBindings(root: ParentNode): RuntimeFeedChannelBinding[] {
    return collectFeedChannelBindings(
      root,
      '[data-testid="primaryColumn"] [role="tablist"] [role="tab"]',
      new URL(window.location.href),
      { isActive: (element) => element.getAttribute('aria-selected') === 'true' },
    );
  }

  parseCard(element: Element, context: FeedPageContext): FeedItem | null {
    return parseTwitterCard(element, context.url);
  }

  triggerAction(itemId: string, actionId: string): boolean {
    return triggerTwitterAction(this.getRuntimeElement(itemId), actionId);
  }
}

export const twitterAdapterDefinition: AdapterDefinition = {
  source: TWITTER_SOURCE,
  matches: (url) => SUPPORTED_HOSTS.has(url.hostname) && SUPPORTED_PATHS.has(url.pathname),
  create: (onItems) => new TwitterAdapter(onItems),
};
