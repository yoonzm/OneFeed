import type { FeedItem, FeedSource } from '../../types/feed';
import { BaseAdapter, type AdapterDefinition } from './base';

const CARD_SELECTOR = '.cell.item';
const SOURCE: FeedSource = {
  id: 'v2ex',
  name: 'V2EX',
  homeUrl: 'https://www.v2ex.com/',
};

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
  const communityLink = element.querySelector<HTMLAnchorElement>('.topic_info .node, a.node');
  const communityName = communityLink?.textContent?.trim();
  const reactions = parseV2exCount(element.querySelector('.votes')?.textContent || '');
  const replies = parseV2exCount(
    element.querySelector('.count_livid, .count_orange, .count_blue')?.textContent || '',
  );

  return {
    id: `v2ex_${originId}`,
    platform: 'v2ex',
    source: SOURCE,
    originalUrl: originalUrl || window.location.href,
    kind: 'discussion',
    title,
    author: {
      name: authorName,
      avatar: absoluteUrl(avatarElement?.getAttribute('src') || ''),
      link: authorLink
        ? absoluteUrl(authorLink.getAttribute('href') || '') || undefined
        : undefined,
    },
    context: communityName ? {
      community: {
        name: communityName,
        url: absoluteUrl(communityLink?.getAttribute('href') || '') || undefined,
      },
    } : undefined,
    publishedAt: element.querySelector('.topic_info [title]')?.getAttribute('title') || undefined,
    blocks: [],
    metrics: [
      { kind: 'reactions', value: reactions, label: '赞同' },
      { kind: 'replies', value: replies, label: '回复' },
    ],
    actions: [
      {
        id: 'react',
        kind: 'react',
        variant: 'agree',
        label: '赞同',
        count: reactions,
        enabled: true,
        fallback: 'openOriginal',
      },
      {
        id: 'reply',
        kind: 'reply',
        label: '回复',
        count: replies,
        enabled: true,
        fallback: 'openOriginal',
      },
      { id: 'open', kind: 'open', label: '查看原文', enabled: true },
    ],
  };
}

export function triggerV2exAction(element: Element | undefined, actionId: string): boolean {
  const selector = actionId === 'react'
    ? '.votes button, button[aria-label*="赞同"], button[title*="赞同"]'
    : actionId === 'reply'
      ? 'button[aria-label*="回复"], button[title*="回复"]'
      : '';
  if (!selector) return false;
  const button = element?.querySelector<HTMLElement>(selector);
  if (!button) return false;
  button.click();
  return true;
}

export class V2exAdapter extends BaseAdapter {
  protected readonly cardSelector = CARD_SELECTOR;

  parseCard(element: Element): FeedItem | null {
    return parseV2exCard(element);
  }

  triggerAction(itemId: string, actionId: string): boolean {
    return triggerV2exAction(this.getRuntimeElement(itemId), actionId);
  }
}

export const v2exAdapterDefinition: AdapterDefinition = {
  source: SOURCE,
  matches: (hostname) => hostname === 'v2ex.com' || hostname.endsWith('.v2ex.com'),
  create: (onItems) => new V2exAdapter(onItems),
};
