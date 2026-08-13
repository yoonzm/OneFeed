import DOMPurify from 'dompurify';
import { REDDIT_PLATFORM } from '../../config/platforms';
import type {
  FeedBlock,
  FeedImage,
  FeedItem,
  FeedLinkPreview,
  FeedVideo,
} from '../../types/feed';
import {
  BaseAdapter,
  type AdapterDefinition,
  type FeedPageContext,
} from './base';

/**
 * Reddit 当前列表卡片由 Shreddit Web Component 承载；业务字段在宿主属性中，
 * 投票和评论控件则位于开放的 Shadow Root。选择器集中在这里，避免渗入 Renderer。
 */
const CARD_SELECTOR = 'shreddit-post[id^="t3_"]';
const SOURCE = REDDIT_PLATFORM;
const ROOT_FEED_PATHS = new Set([
  '/',
  '/best',
  '/best/',
  '/hot',
  '/hot/',
  '/new',
  '/new/',
  '/top',
  '/top/',
]);
const COMMUNITY_FEED_PATH = /^\/r\/[^/]+(?:\/(?:hot|new|top|rising|controversial))?\/?$/i;

function absoluteUrl(value: string, pageUrl: URL): string {
  if (!value) return '';
  try {
    return new URL(value, pageUrl).href;
  } catch {
    return '';
  }
}

function positiveNumber(value: string | null): number | undefined {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : undefined;
}

export function parseRedditCount(value: string): number {
  const normalized = value.replace(/,/g, '').trim();
  const match = normalized.match(/(-?\d+(?:\.\d+)?)\s*([KMB]?)/i);
  if (!match) return 0;

  const multipliers: Record<string, number> = {
    K: 1_000,
    M: 1_000_000,
    B: 1_000_000_000,
  };
  const unit = match[2]?.toUpperCase() || '';
  return Math.round(Number(match[1]) * (multipliers[unit] || 1));
}

function cleanTextBody(
  element: Element,
  pageUrl: URL,
): { html: string; plainText: string } | undefined {
  const body = element.querySelector('[property="schema:articleBody"]');
  if (!body) return undefined;

  const clone = body.cloneNode(true) as Element;
  clone.querySelectorAll('script, style, button, svg, video').forEach((node) => node.remove());
  clone.querySelectorAll('img').forEach((image) => {
    image.replaceWith(document.createTextNode(image.getAttribute('alt') || ''));
  });
  clone.querySelectorAll('a').forEach((link) => {
    const href = absoluteUrl(link.getAttribute('href') || '', pageUrl);
    if (href) link.setAttribute('href', href);
    else link.removeAttribute('href');
    link.setAttribute('target', '_blank');
    link.setAttribute('rel', 'noreferrer');
  });
  clone.querySelectorAll('*').forEach((node) => {
    Array.from(node.attributes).forEach((attribute) => {
      if (!['href', 'target', 'rel'].includes(attribute.name)) {
        node.removeAttribute(attribute.name);
      }
    });
  });

  const plainText = clone.textContent?.replace(/\s+/g, ' ').trim() || '';
  if (!plainText) return undefined;
  return {
    html: DOMPurify.sanitize(clone.innerHTML, {
      ALLOWED_TAGS: [
        'p', 'br', 'strong', 'b', 'em', 'i', 'a', 'ul', 'ol', 'li',
        'blockquote', 'code', 'pre', 'del', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      ],
      ALLOWED_ATTR: ['href', 'target', 'rel'],
    }),
    plainText,
  };
}

function imageFromElement(
  image: HTMLImageElement,
  title: string,
  pageUrl: URL,
): FeedImage | undefined {
  const url = absoluteUrl(
    image.getAttribute('src') || image.getAttribute('data-src') || '',
    pageUrl,
  );
  if (!url) return undefined;

  const width = positiveNumber(image.getAttribute('width'));
  const height = positiveNumber(image.getAttribute('height'));
  return {
    url,
    alt: image.getAttribute('alt') || title || 'Reddit 帖子图片',
    width,
    height,
    aspectRatio: width && height ? width / height : undefined,
  };
}

function extractImages(element: Element, title: string, pageUrl: URL): FeedImage[] {
  const primaryImages = Array.from(
    element.querySelectorAll<HTMLImageElement>('img[data-post-media-primary]'),
  );
  const candidates = primaryImages.length
    ? primaryImages
    : Array.from(element.querySelectorAll<HTMLImageElement>(
        '[slot="post-media-container"] img[src]:not([role="presentation"]):not(.post-background-image-filter)',
      ));
  const seen = new Set<string>();
  const images = candidates
    .map((image) => imageFromElement(image, title, pageUrl))
    .filter((image): image is FeedImage => {
      if (!image || seen.has(image.url)) return false;
      seen.add(image.url);
      return true;
    });

  const contentUrl = absoluteUrl(element.getAttribute('content-href') || '', pageUrl);
  if (
    !images.length &&
    element.getAttribute('post-type') === 'image' &&
    /\.(?:avif|gif|jpe?g|png|webp)(?:[?#]|$)/i.test(contentUrl)
  ) {
    images.push({ url: contentUrl, alt: title || 'Reddit 帖子图片' });
  }
  return images;
}

function extractVideo(element: Element, title: string, pageUrl: URL): FeedVideo | undefined {
  if (element.getAttribute('post-type') !== 'video') return undefined;

  const player = element.querySelector('shreddit-player, video');
  const poster = absoluteUrl(player?.getAttribute('poster') || '', pageUrl);
  const video = element.querySelector<HTMLVideoElement>('video[src]');
  const url = absoluteUrl(video?.getAttribute('src') || '', pageUrl);
  const duration = Number(player?.getAttribute('duration'));
  return {
    poster,
    alt: title || 'Reddit 视频封面',
    url: url || undefined,
    durationSeconds: Number.isFinite(duration) && duration > 0 ? duration : undefined,
  };
}

function extractLinkPreview(
  element: Element,
  pageUrl: URL,
): FeedLinkPreview | undefined {
  if (element.getAttribute('post-type') !== 'link') return undefined;

  const url = absoluteUrl(element.getAttribute('content-href') || '', pageUrl);
  if (!url) return undefined;
  const thumbnail = element.querySelector<HTMLImageElement>('[slot="thumbnail"] img[src]');
  return {
    url,
    image: thumbnail
      ? absoluteUrl(thumbnail.getAttribute('src') || '', pageUrl) || undefined
      : undefined,
    siteName: element.getAttribute('domain') || undefined,
  };
}

function shadowAction(
  element: Element | undefined,
  selector: string,
): HTMLElement | null {
  return element?.shadowRoot?.querySelector<HTMLElement>(selector) || null;
}

function getFlags(element: Element): FeedItem['flags'] {
  const flags = {
    sensitive: element.hasAttribute('is-nsfw') || element.hasAttribute('over-18'),
    spoiler: element.hasAttribute('is-spoiler') || element.hasAttribute('spoiler'),
    locked: element.hasAttribute('is-locked') || element.hasAttribute('locked'),
    pinned: element.hasAttribute('is-pinned') || element.hasAttribute('stickied'),
  };
  return Object.values(flags).some(Boolean) ? flags : undefined;
}

export function parseRedditCard(
  element: Element,
  pageUrl = new URL(window.location.href),
): FeedItem | null {
  const permalink = element.getAttribute('permalink') ||
    element.querySelector('[slot="full-post-link"], [slot="title"]')?.getAttribute('href') || '';
  const originalUrl = absoluteUrl(permalink, pageUrl) || pageUrl.href;
  const originId = element.id.replace(/^t3_/, '') ||
    originalUrl.match(/\/comments\/([^/?#]+)/)?.[1] || '';
  if (!originId) return null;

  const title = element.getAttribute('post-title')?.trim() ||
    element.querySelector('[slot="title"]')?.textContent?.trim() || '';
  const authorName = element.getAttribute('author')?.trim() || 'Reddit 用户';
  const communityName = element.getAttribute('subreddit-prefixed-name')?.trim() ||
    (element.getAttribute('subreddit-name')
      ? `r/${element.getAttribute('subreddit-name')}`
      : 'Reddit');
  const communityPath = communityName.startsWith('r/') ? `/${communityName}/` : '';
  const text = cleanTextBody(element, pageUrl);
  const images = extractImages(element, title, pageUrl);
  const video = extractVideo(element, title, pageUrl);
  const linkPreview = extractLinkPreview(element, pageUrl);
  const blocks: FeedBlock[] = [
    ...(text ? [{ type: 'richText' as const, ...text }] : []),
    ...(video
      ? [{ type: 'video' as const, media: video }]
      : images.length
        ? [{ type: 'gallery' as const, items: images }]
        : []),
    ...(linkPreview ? [{ type: 'linkPreview' as const, preview: linkPreview }] : []),
  ];
  if (!title && !blocks.length) return null;

  const scoreValue = element.getAttribute('score');
  const score = parseRedditCount(scoreValue || '');
  const replies = parseRedditCount(element.getAttribute('comment-count') || '');
  const feedIndex = Number(element.getAttribute('feedindex'));
  const recommendationSource = element.getAttribute('recommendation-source');
  const flair = element.querySelector('[slot="post-flair"]')?.textContent?.trim() || '';
  const upvote = shadowAction(element, '[data-action-bar-action="upvote"], button[upvote]');

  return {
    id: `reddit_${originId}`,
    platform: 'reddit',
    source: SOURCE,
    originalUrl,
    kind: 'discussion',
    role: 'topic',
    author: {
      name: authorName,
      avatar: absoluteUrl(element.getAttribute('icon') || '', pageUrl),
      link: absoluteUrl(`/user/${encodeURIComponent(authorName)}/`, pageUrl),
    },
    sequence: Number.isInteger(feedIndex) && feedIndex >= 0 ? feedIndex + 1 : undefined,
    context: {
      community: {
        id: element.getAttribute('subreddit-id')?.replace(/^t5_/, '') || undefined,
        name: communityName,
        url: communityPath ? absoluteUrl(communityPath, pageUrl) : undefined,
      },
      reason: recommendationSource ? {
        type: 'recommended',
        label: '推荐',
      } : undefined,
      tags: flair ? [{ name: flair }] : undefined,
    },
    publishedAt: element.getAttribute('created-timestamp') || undefined,
    title: title || undefined,
    previewBlocks: blocks,
    metrics: scoreValue !== null ? [{ kind: 'score', value: score, label: '分数' }] : [],
    actions: [
      {
        id: 'react',
        kind: 'react',
        variant: 'upvote',
        label: '赞同',
        active: upvote?.getAttribute('aria-pressed') === 'true',
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
      { id: 'open', kind: 'open', label: '查看原文', enabled: true },
    ],
    flags: getFlags(element),
  };
}

export function triggerRedditAction(
  element: Element | undefined,
  actionId: string,
): boolean {
  const target = actionId === 'react'
    ? shadowAction(element, '[data-action-bar-action="upvote"], button[upvote]')
    : actionId === 'reply'
      ? shadowAction(element, '[data-action-bar-action="comments"]')
      : null;
  if (!target) return false;
  target.click();
  return true;
}

export function isRedditFeedUrl(url: URL): boolean {
  return ['reddit.com', 'www.reddit.com'].includes(url.hostname) && (
    ROOT_FEED_PATHS.has(url.pathname) || COMMUNITY_FEED_PATH.test(url.pathname)
  );
}

export class RedditAdapter extends BaseAdapter {
  protected readonly cardSelector = CARD_SELECTOR;

  parseCard(element: Element, context: FeedPageContext): FeedItem | null {
    return parseRedditCard(element, context.url);
  }

  triggerAction(itemId: string, actionId: string): boolean {
    return triggerRedditAction(this.getRuntimeElement(itemId), actionId);
  }
}

export const redditAdapterDefinition: AdapterDefinition = {
  source: SOURCE,
  matches: isRedditFeedUrl,
  create: (onItems) => new RedditAdapter(onItems),
};
