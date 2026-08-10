import DOMPurify from 'dompurify';
import type {
  FeedActionDescriptor,
  FeedAuthor,
  FeedBlock,
  FeedImage,
  FeedItem,
  FeedMetric,
  FeedSource,
} from '../../types/feed';
import { BaseAdapter, type AdapterDefinition } from './base';

const CARD_SELECTOR = [
  '.TopstoryItem',
  '.AnswerItem',
  '.ArticleItem',
  '.ContentItem',
].join(', ');

const BODY_SELECTOR = [
  '.RichContent-inner',
  '.Post-RichText',
  '.RichText',
  '.CopyrightRichText-richText',
  '.ContentItem-content',
].join(', ');

export const ZHIHU_SOURCE: FeedSource = {
  id: 'zhihu',
  name: '知乎',
  homeUrl: 'https://www.zhihu.com/',
};

function firstText(element: Element, selectors: string[]): string {
  for (const selector of selectors) {
    const text = element.querySelector(selector)?.textContent?.trim();
    if (text) return text;
  }
  return '';
}

function firstAttribute(
  element: Element,
  selectors: string[],
  attribute: string,
): string {
  for (const selector of selectors) {
    const value = element.querySelector(selector)?.getAttribute(attribute)?.trim();
    if (value) return value;
  }
  return '';
}

function absoluteUrl(value: string): string {
  if (!value) return '';
  try {
    return new URL(value, window.location.origin).href;
  } catch {
    return '';
  }
}

export function parseCount(value: string): number {
  const normalized = value.replace(/,/g, '').trim();
  const match = normalized.match(/(\d+(?:\.\d+)?)\s*([万千]?)/);
  if (!match) return 0;

  const multiplier = match[2] === '万' ? 10000 : match[2] === '千' ? 1000 : 1;
  return Math.round(Number(match[1]) * multiplier);
}

function stableHash(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

interface ZhihuMetadata {
  authorName?: string;
  itemId?: string;
  title?: string;
}

function getMetadata(element: Element): ZhihuMetadata {
  const value = element.getAttribute('data-zop') ||
    element.querySelector('[data-zop]')?.getAttribute('data-zop');
  if (!value) return {};

  try {
    return JSON.parse(value) as ZhihuMetadata;
  } catch {
    return {};
  }
}

function getOriginalUrl(element: Element): string {
  const link = firstAttribute(
    element,
    [
      '.ContentItem-title a',
      '.QuestionItem-title a',
      'meta[itemprop="url"]',
      'a[href*="/question/"]',
      'a[href*="/p/"]',
    ],
    'href',
  );
  return absoluteUrl(link) || window.location.href;
}

function extractMedia(body: Element): FeedImage[] {
  const seen = new Set<string>();
  return Array.from(body.querySelectorAll('img'))
    .map((image) => {
      const url = absoluteUrl(
        image.getAttribute('data-original') ||
          image.getAttribute('data-actualsrc') ||
          image.getAttribute('src') ||
          '',
      );
      return { url, alt: image.getAttribute('alt') || '' };
    })
    .filter((media) => {
      if (!media.url || seen.has(media.url)) return false;
      seen.add(media.url);
      return true;
    });
}

function cleanContent(body: Element): string {
  const clone = body.cloneNode(true) as Element;
  clone.querySelectorAll('img, video, button, svg, noscript').forEach((node) => node.remove());
  clone.querySelectorAll('[style], [class], [id]').forEach((node) => {
    node.removeAttribute('style');
    node.removeAttribute('class');
    node.removeAttribute('id');
  });
  return DOMPurify.sanitize(clone.innerHTML, {
    ALLOWED_TAGS: ['p', 'br', 'h2', 'h3', 'h4', 'strong', 'b', 'em', 'i', 'u', 's', 'blockquote', 'ol', 'ul', 'li', 'a', 'code', 'pre'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  });
}

export interface ParsedZhihuContent {
  originId: string;
  originalUrl: string;
  title?: string;
  author: FeedAuthor;
  blocks: FeedBlock[];
  metrics: FeedMetric[];
  actions: FeedActionDescriptor[];
}

export function parseZhihuContent(element: Element): ParsedZhihuContent | null {
  const body = element.querySelector(BODY_SELECTOR);
  if (!body) return null;

  const metadata = getMetadata(element);
  const title = firstText(element, [
    '.ContentItem-title',
    '.QuestionItem-title',
    'h2',
  ]) || metadata.title || '';
  const originalUrl = getOriginalUrl(element);
  const authorName = firstText(element, [
    '.AuthorInfo-name',
    '.UserLink-link',
    '[itemprop="name"]',
  ]) || metadata.authorName || '';
  const avatar = absoluteUrl(
    firstAttribute(element, ['.Avatar', '.AuthorInfo-avatar img'], 'src'),
  );
  const contentHtml = cleanContent(body);
  const contentText = body.textContent?.trim() || '';
  if (!title && !contentText) return null;

  const originId =
    element.getAttribute('data-id') ||
    metadata.itemId ||
    originalUrl.match(/\/answer\/(\d+)/)?.[1] ||
    originalUrl.match(/\/p\/(\d+)/)?.[1] ||
    originalUrl.match(/\/question\/(\d+)/)?.[1] ||
    stableHash(`${originalUrl}|${title}|${authorName}|${contentText.slice(0, 120)}`);
  const images = extractMedia(body);
  const agrees = parseCount(firstText(element, ['.Button--voteUp', '[aria-label*="赞同"]']));
  const comments = parseCount(firstText(element, ['.ContentItem-action', 'button[aria-label*="评论"]']));

  return {
    originId,
    originalUrl,
    title: title || undefined,
    author: {
      name: authorName || '知乎用户',
      avatar,
      link: absoluteUrl(firstAttribute(element, ['.AuthorInfo-name a', '.UserLink-link'], 'href')) || undefined,
    },
    blocks: [
      { type: 'richText', html: contentHtml, plainText: contentText },
      ...(images.length ? [{ type: 'gallery' as const, items: images }] : []),
    ],
    metrics: [
      { kind: 'reactions', value: agrees, label: '赞同' },
      { kind: 'replies', value: comments, label: '评论' },
    ],
    actions: [
      {
        id: 'react',
        kind: 'react',
        variant: 'agree',
        label: '赞同',
        count: agrees,
        enabled: true,
        fallback: 'openOriginal',
      },
      {
        id: 'reply',
        kind: 'reply',
        label: '评论',
        count: comments,
        enabled: true,
        fallback: 'openOriginal',
      },
      { id: 'open', kind: 'open', label: '查看原文', enabled: true },
    ],
  };
}

export function parseZhihuCard(element: Element): FeedItem | null {
  const content = parseZhihuContent(element);
  if (!content) return null;

  return {
    id: `zhihu_${content.originId}`,
    platform: 'zhihu',
    source: ZHIHU_SOURCE,
    originalUrl: content.originalUrl,
    kind: 'article',
    title: content.title,
    author: content.author,
    previewBlocks: content.blocks,
    metrics: content.metrics,
    actions: content.actions,
  };
}

export function triggerZhihuAction(element: Element | undefined, actionId: string): boolean {
  const selector = actionId === 'react'
    ? 'button.VoteButton:not(.VoteButton--down), .Button--voteUp, [aria-label*="赞同"]'
    : actionId === 'reply'
      ? '.ContentItem-action, button[aria-label*="评论"]'
      : '';
  if (!selector) return false;
  const button = element?.querySelector<HTMLElement>(selector);
  if (!button) return false;
  button.click();
  return true;
}

export class ZhihuAdapter extends BaseAdapter {
  protected readonly cardSelector = CARD_SELECTOR;

  parseCard(element: Element): FeedItem | null {
    return parseZhihuCard(element);
  }

  triggerAction(itemId: string, actionId: string): boolean {
    return triggerZhihuAction(this.getRuntimeElement(itemId), actionId);
  }
}

export const zhihuAdapterDefinition: AdapterDefinition = {
  source: ZHIHU_SOURCE,
  matches: (url) => [
    'zhihu.com',
    'www.zhihu.com',
  ].includes(url.hostname) && ['/', '/follow', '/hot', '/recommend'].includes(url.pathname),
  create: (onItems) => new ZhihuAdapter(onItems),
};
