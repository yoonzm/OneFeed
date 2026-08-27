import DOMPurify from 'dompurify';
import { REDDIT_PLATFORM } from '../../config/platforms';
import { i18n } from '../../i18n';
import type { FeedBlock, FeedImage, FeedItem } from '../../types/feed';
import {
  BaseAdapter,
  type AdapterDefinition,
  type FeedPageContext,
} from './base';

const CARD_SELECTOR = 'shreddit-post[id][permalink]';
const SUPPORTED_HOSTS = new Set(['reddit.com', 'www.reddit.com']);

export const REDDIT_SOURCE = REDDIT_PLATFORM;

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

export function parseRedditCount(value: string): number {
  const match = value.replace(/,/g, '').trim().match(/(-?\d+(?:\.\d+)?)\s*([KMB万千]?)/i);
  if (!match) return 0;

  const unit = match[2]?.toUpperCase() || '';
  const multipliers: Record<string, number> = {
    K: 1_000,
    M: 1_000_000,
    B: 1_000_000_000,
    千: 1_000,
    万: 10_000,
  };
  return Math.round(Number(match[1]) * (multipliers[unit] || 1));
}

function createRichTextBlock(element: Element, pageUrl: URL): FeedBlock | null {
  const clone = element.cloneNode(true) as Element;
  // 第三方翻译扩展可能把隐藏译文插入原帖；保留它会在移除 style 后重复正文。
  clone.querySelectorAll([
    '.immersive-translate-target-wrapper',
    '[data-immersive-translate-translation-element-mark]',
    'script',
    'style',
    'noscript',
    'button',
    'svg',
    'img',
    'video',
  ].join(', ')).forEach((node) => {
    node.remove();
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
      if (!['href', 'target', 'rel'].includes(attribute.name)) {
        node.removeAttribute(attribute.name);
      }
    });
  });

  const plainText = normalizedText(clone);
  if (!plainText) return null;
  const html = DOMPurify.sanitize(clone.innerHTML, {
    ALLOWED_TAGS: [
      'p', 'br', 'div', 'span', 'strong', 'b', 'em', 'i', 'u', 's',
      'blockquote', 'ol', 'ul', 'li', 'a', 'code', 'pre',
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  }).trim();
  return { type: 'richText', html, plainText };
}

function findTextBody(element: Element): Element | null {
  const body = element.querySelector('shreddit-post-text-body[slot="text-body"]');
  if (!body) return null;
  return body.querySelector('[id$="-post-rtjson-content"]') || body;
}

function extractImages(element: Element, pageUrl: URL, title: string): FeedImage[] {
  const seen = new Set<string>();
  return Array.from(
    element.querySelectorAll<HTMLImageElement>('[slot="post-media-container"] img[src]'),
  ).map((image) => ({
    url: absoluteUrl(image.getAttribute('src') || '', pageUrl),
    alt: image.getAttribute('alt') || title,
    width: image.width || undefined,
    height: image.height || undefined,
  })).filter((image) => {
    if (!image.url || seen.has(image.url)) return false;
    seen.add(image.url);
    return true;
  });
}

function recommendationLabel(element: Element): string {
  const labels = Array.from(
    element.querySelectorAll('[slot="credit-bar"] [id$="-post-rtjson-content"]'),
  ).map((candidate) => normalizedText(candidate)).filter(Boolean);
  return labels.at(-1) || '';
}

export function parseRedditCard(
  element: Element,
  pageUrl = new URL(window.location.href),
): FeedItem | null {
  const rawId = element.id.trim();
  const permalink = element.getAttribute('permalink')?.trim() || '';
  const originalUrl = absoluteUrl(permalink, pageUrl);
  const title = element.getAttribute('post-title')?.trim() || '';
  // 广告和详情之外的非帖子节点不会同时提供 Reddit 帖子 ID 与 comments 永久链接。
  if (!rawId.startsWith('t3_') || !/\/comments\/[a-z0-9]+\//i.test(permalink) || !title) {
    return null;
  }
  if (element.hasAttribute('promoted') || element.hasAttribute('is-promoted')) return null;

  const authorName = element.getAttribute('author')?.trim() || '';
  const communityName = element.getAttribute('subreddit-prefixed-name')?.trim() || '';
  const communitySlug = element.getAttribute('subreddit-name')?.trim() ||
    communityName.replace(/^r\//, '');
  const recommendationSource = element.getAttribute('recommendation-source')?.trim() || '';
  const body = findTextBody(element);
  const richText = body ? createRichTextBlock(body, pageUrl) : null;
  const images = extractImages(element, pageUrl, title);
  const contentHref = absoluteUrl(element.getAttribute('content-href') || '', pageUrl);
  const postType = element.getAttribute('post-type') || '';
  const previewBlocks: FeedBlock[] = [
    ...(richText ? [richText] : []),
    ...(images.length ? [{ type: 'gallery' as const, items: images }] : []),
    ...(postType === 'link' && contentHref && contentHref !== originalUrl ? [{
      type: 'linkPreview' as const,
      preview: {
        url: contentHref,
        title,
        siteName: element.getAttribute('domain') || undefined,
      },
    }] : []),
  ];
  const score = parseRedditCount(element.getAttribute('score') || '');
  const replies = parseRedditCount(element.getAttribute('comment-count') || '');
  const tags = Array.from(element.querySelectorAll('shreddit-post-flair'))
    .map((flair) => normalizedText(flair))
    .filter(Boolean)
    .map((name) => ({ name }));
  const reasonLabel = recommendationLabel(element);
  const flags = {
    sensitive: element.hasAttribute('nsfw') || element.hasAttribute('is-nsfw'),
    spoiler: element.hasAttribute('spoiler') || element.hasAttribute('is-spoiler'),
    pinned: element.hasAttribute('stickied') || element.hasAttribute('is-stickied'),
  };

  return {
    id: `reddit_${rawId.replace(/^t3_/, '')}`,
    platform: 'reddit',
    source: REDDIT_SOURCE,
    originalUrl,
    kind: 'discussion',
    role: 'topic',
    title,
    author: {
      name: authorName,
      avatar: absoluteUrl(element.getAttribute('icon') || '', pageUrl),
      link: authorName
        ? absoluteUrl(`/user/${encodeURIComponent(authorName)}/`, pageUrl)
        : undefined,
    },
    context: communityName || recommendationSource || tags.length ? {
      ...(communityName ? {
        community: {
          id: element.getAttribute('subreddit-id') || undefined,
          name: communityName,
          url: communitySlug
            ? absoluteUrl(`/r/${encodeURIComponent(communitySlug)}/`, pageUrl)
            : undefined,
        },
      } : {}),
      ...(recommendationSource ? {
        reason: {
          type: 'recommended' as const,
          label: reasonLabel || recommendationSource,
        },
      } : {}),
      ...(tags.length ? { tags } : {}),
    } : undefined,
    publishedAt: element.getAttribute('created-timestamp') || undefined,
    previewBlocks,
    metrics: [
      { kind: 'score', value: score, label: i18n.t('adapter.score') },
      { kind: 'replies', value: replies, label: i18n.t('adapter.comments') },
    ],
    actions: [
      { id: 'open', kind: 'open', label: i18n.t('adapter.openPost'), enabled: true },
    ],
    flags: Object.values(flags).some(Boolean) ? flags : undefined,
  };
}

export class RedditAdapter extends BaseAdapter {
  protected readonly cardSelector = CARD_SELECTOR;

  parseCard(element: Element, context: FeedPageContext): FeedItem | null {
    return parseRedditCard(element, context.url);
  }

  triggerAction(itemId: string, actionId: string): boolean {
    void itemId;
    void actionId;
    return false;
  }
}

function isSupportedPath(pathname: string): boolean {
  const path = pathname.replace(/\/+$/, '') || '/';
  return ['/', '/best', '/hot', '/new', '/r/all', '/r/popular'].includes(path) ||
    /^\/r\/[^/]+$/.test(path);
}

export const redditAdapterDefinition: AdapterDefinition = {
  source: REDDIT_SOURCE,
  matches: (url) => SUPPORTED_HOSTS.has(url.hostname) && isSupportedPath(url.pathname),
  create: (onItems) => new RedditAdapter(onItems),
};
