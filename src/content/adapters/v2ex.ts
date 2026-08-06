import DOMPurify from 'dompurify';
import type { FeedAction, FeedItem } from '../../types/feed';
import { BaseAdapter, type AdapterDefinition } from './base';

const CARD_SELECTOR = '.cell.item';

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

export function parseV2exCount(value: string): number {
  const normalized = value.replace(/,/g, '').trim();
  const match = normalized.match(/(\d+(?:\.\d+)?)\s*([KMB万千]?)/i);
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

function cleanMetadata(element: Element | null): string {
  if (!element) return '';

  const clone = element.cloneNode(true) as Element;
  clone.querySelectorAll('script, style, svg, .votes').forEach((node) => node.remove());
  clone.querySelectorAll('a[href]').forEach((link) => {
    const href = absoluteUrl(link.getAttribute('href') || '');
    if (href) link.setAttribute('href', href);
    link.setAttribute('target', '_blank');
    link.setAttribute('rel', 'noreferrer');
  });
  clone.querySelectorAll('[style], [class], [id], [title]').forEach((node) => {
    node.removeAttribute('style');
    node.removeAttribute('class');
    node.removeAttribute('id');
    node.removeAttribute('title');
  });

  return DOMPurify.sanitize(clone.innerHTML, {
    ALLOWED_TAGS: ['a', 'strong', 'span', 'br'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  });
}

export function parseV2exCard(element: Element): FeedItem | null {
  const titleLink = element.querySelector<HTMLAnchorElement>(
    '.topic-link, .item_title a[href^="/t/"]',
  );
  const title = titleLink?.textContent?.trim() || '';
  if (!titleLink || !title) return null;

  const originalUrl = absoluteUrl(titleLink.getAttribute('href') || '');
  const authorLink = element.querySelector<HTMLAnchorElement>(
    '.topic_info a[href^="/member/"]',
  ) || element.querySelector<HTMLAnchorElement>('a[href^="/member/"]');
  const avatarElement = element.querySelector<HTMLImageElement>('img.avatar');
  const authorName = authorLink?.textContent?.trim() ||
    avatarElement?.getAttribute('alt')?.trim() ||
    'V2EX 用户';
  const originId = originalUrl.match(/\/t\/(\d+)/)?.[1] ||
    stableHash(`${originalUrl}|${title}|${authorName}`);

  return {
    id: `v2ex_${originId}`,
    platform: 'v2ex',
    originalUrl: originalUrl || window.location.href,
    title,
    author: {
      name: authorName,
      avatar: absoluteUrl(avatarElement?.getAttribute('src') || ''),
      link: authorLink
        ? absoluteUrl(authorLink.getAttribute('href') || '') || undefined
        : undefined,
    },
    createdAt: element.querySelector('.topic_info [title]')?.getAttribute('title') || undefined,
    contentHtml: cleanMetadata(element.querySelector('.topic_info')),
    media: [],
    stats: {
      likes: parseV2exCount(element.querySelector('.votes')?.textContent || ''),
      comments: parseV2exCount(
        element.querySelector('.count_livid, .count_orange, .count_blue')?.textContent || '',
      ),
    },
    rawElementRef: element,
  };
}

export function triggerV2exAction(item: FeedItem, action: FeedAction): boolean {
  const selector = action === 'like'
    ? '.votes button, button[aria-label*="赞同"], button[title*="赞同"]'
    : 'button[aria-label*="回复"], button[title*="回复"]';
  const button = item.rawElementRef?.querySelector<HTMLElement>(selector);
  if (!button) return false;
  button.click();
  return true;
}

export class V2exAdapter extends BaseAdapter {
  protected readonly cardSelector = CARD_SELECTOR;

  parseCard(element: Element): FeedItem | null {
    return parseV2exCard(element);
  }

  triggerAction(item: FeedItem, action: FeedAction): boolean {
    return triggerV2exAction(item, action);
  }
}

export const v2exAdapterDefinition: AdapterDefinition = {
  source: {
    id: 'v2ex',
    name: 'V2EX',
    homeUrl: 'https://www.v2ex.com/',
    likeLabel: '赞同',
    commentLabel: '回复',
  },
  matches: (hostname) => hostname === 'v2ex.com' || hostname.endsWith('.v2ex.com'),
  create: (onItems) => new V2exAdapter(onItems),
};
