import { LINUX_DO_PLATFORM } from '../../config/platforms';
import { i18n } from '../../i18n';
import type { FeedItem } from '../../types/feed';
import {
  BaseAdapter,
  collectFeedChannelBindings,
  type AdapterDefinition,
  type RuntimeFeedChannelBinding,
} from './base';

const CARD_SELECTOR = '.topic-list-item';
export const LINUX_DO_SOURCE = LINUX_DO_PLATFORM;

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

export function parseLinuxDoCount(value: string): number {
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

function getAuthor(element: Element): FeedItem['author'] {
  const authorLink = element.querySelector<HTMLAnchorElement>('.posters a[data-user-card]');
  const avatarElement = authorLink?.querySelector<HTMLImageElement>('img.avatar');
  const displayName = avatarElement?.getAttribute('title')?.split(' - ')[0]?.trim();

  return {
    name: displayName || authorLink?.getAttribute('data-user-card') || i18n.t('adapter.linuxDoUser'),
    avatar: absoluteUrl(avatarElement?.getAttribute('src') || ''),
    link: authorLink
      ? absoluteUrl(authorLink.getAttribute('href') || '') || undefined
      : undefined,
  };
}

export function parseLinuxDoCard(element: Element): FeedItem | null {
  const titleLink = element.querySelector<HTMLAnchorElement>(
    '.raw-topic-link, a.title[href^="/t/"]',
  );
  const title = titleLink?.textContent?.trim() || '';
  if (!titleLink || !title) return null;

  const originalUrl = absoluteUrl(titleLink.getAttribute('href') || '');
  const author = getAuthor(element);
  const timeValue = element.querySelector('.relative-date[data-time]')?.getAttribute('data-time');
  const createdAt = timeValue ? Number(timeValue) : undefined;
  const originId = element.getAttribute('data-topic-id') ||
    originalUrl.match(/\/t\/[^/]+\/(\d+)/)?.[1] ||
    stableHash(`${originalUrl}|${title}|${author.name}`);
  const categoryLink = element.querySelector<HTMLAnchorElement>('.badge-category[href]');
  const categoryName = categoryLink?.textContent?.trim();
  const tags = Array.from(element.querySelectorAll<HTMLAnchorElement>('.discourse-tag[href]'))
    .map((tag) => ({
      name: tag.textContent?.trim() || '',
      url: absoluteUrl(tag.getAttribute('href') || '') || undefined,
    }))
    .filter((tag) => tag.name);
  const replies = parseLinuxDoCount(
    element.querySelector('.posts .number, .badge-posts')?.textContent || '',
  );
  const views = parseLinuxDoCount(element.querySelector('.views .number')?.textContent || '');

  return {
    id: `linux-do_${originId}`,
    platform: 'linux-do',
    source: LINUX_DO_SOURCE,
    originalUrl: originalUrl || window.location.href,
    kind: 'discussion',
    role: 'topic',
    title,
    author,
    context: categoryName || tags.length ? {
      community: categoryName ? {
        name: categoryName,
        url: absoluteUrl(categoryLink?.getAttribute('href') || '') || undefined,
      } : undefined,
      tags,
    } : undefined,
    publishedAt: Number.isFinite(createdAt) ? createdAt : undefined,
    previewBlocks: [],
    metrics: [
      { kind: 'replies', value: replies, label: i18n.t('adapter.reply') },
      { kind: 'views', value: views, label: i18n.t('adapter.views') },
    ],
    actions: [
      {
        id: 'react',
        kind: 'react',
        variant: 'like',
        label: i18n.t('adapter.like'),
        enabled: true,
        fallback: 'openOriginal',
      },
      {
        id: 'reply',
        kind: 'reply',
        label: i18n.t('adapter.reply'),
        count: replies,
        enabled: true,
        fallback: 'openOriginal',
      },
      { id: 'open', kind: 'open', label: i18n.t('adapter.openOriginal'), enabled: true },
    ],
  };
}

export function triggerLinuxDoAction(element: Element | undefined, actionId: string): boolean {
  const selector = actionId === 'react'
    ? '.topic-list-vote-button, .btn-toggle-reaction-like, button[aria-label*="点赞"], button[title*="点赞"]'
    : actionId === 'reply'
      ? 'button[aria-label*="回复"], button[title*="回复"]'
      : '';
  if (!selector) return false;
  const button = element?.querySelector<HTMLElement>(selector);
  if (!button) return false;
  button.click();
  return true;
}

export class LinuxDoAdapter extends BaseAdapter {
  protected readonly cardSelector = CARD_SELECTOR;

  protected override getFeedChannelBindings(root: ParentNode): RuntimeFeedChannelBinding[] {
    return collectFeedChannelBindings(
      root,
      '#navigation-bar > li > a, .navigation-container .nav-pills > li > a',
      new URL(window.location.href),
    );
  }

  parseCard(element: Element): FeedItem | null {
    return parseLinuxDoCard(element);
  }

  triggerAction(itemId: string, actionId: string): boolean {
    return triggerLinuxDoAction(this.getRuntimeElement(itemId), actionId);
  }
}

export const linuxDoAdapterDefinition: AdapterDefinition = {
  source: LINUX_DO_SOURCE,
  matches: (url) => (
    url.hostname === 'linux.do' || url.hostname.endsWith('.linux.do')
  ) && (
    ['/', '/latest', '/top', '/new', '/unread', '/categories'].includes(url.pathname) ||
    /^\/(?:c|tag)\//.test(url.pathname)
  ),
  create: (onItems) => new LinuxDoAdapter(onItems),
};
