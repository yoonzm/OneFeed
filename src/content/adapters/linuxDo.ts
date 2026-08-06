import DOMPurify from 'dompurify';
import type { FeedAction, FeedItem } from '../../types/feed';
import { BaseAdapter, type AdapterDefinition } from './base';

const CARD_SELECTOR = '.topic-list-item';

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

function cleanSummary(element: Element): string {
  const summary = element.querySelector('.link-bottom-line')?.cloneNode(true) as Element | undefined;
  const container = summary || document.createElement('span');
  const views = element.querySelector('.views .number')?.textContent?.trim();
  if (views) container.append(document.createTextNode(` · ${views} 次浏览`));

  container.querySelectorAll('script, style, svg').forEach((node) => node.remove());
  container.querySelectorAll('a[href]').forEach((link) => {
    const href = absoluteUrl(link.getAttribute('href') || '');
    if (href) link.setAttribute('href', href);
    link.setAttribute('target', '_blank');
    link.setAttribute('rel', 'noreferrer');
  });
  container.querySelectorAll('[style], [class], [id], [data-tag-name]').forEach((node) => {
    node.removeAttribute('style');
    node.removeAttribute('class');
    node.removeAttribute('id');
    node.removeAttribute('data-tag-name');
  });

  return DOMPurify.sanitize(container.innerHTML, {
    ALLOWED_TAGS: ['a', 'span', 'ul', 'li', 'br'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  });
}

function getAuthor(element: Element): FeedItem['author'] {
  const authorLink = element.querySelector<HTMLAnchorElement>('.posters a[data-user-card]');
  const avatarElement = authorLink?.querySelector<HTMLImageElement>('img.avatar');
  const displayName = avatarElement?.getAttribute('title')?.split(' - ')[0]?.trim();

  return {
    name: displayName || authorLink?.getAttribute('data-user-card') || 'Linux DO 用户',
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

  return {
    id: `linux-do_${originId}`,
    platform: 'linux-do',
    originalUrl: originalUrl || window.location.href,
    title,
    author,
    createdAt: Number.isFinite(createdAt) ? createdAt : undefined,
    contentHtml: cleanSummary(element),
    media: [],
    stats: {
      likes: 0,
      comments: parseLinuxDoCount(
        element.querySelector('.posts .number, .badge-posts')?.textContent || '',
      ),
    },
    rawElementRef: element,
  };
}

export function triggerLinuxDoAction(item: FeedItem, action: FeedAction): boolean {
  const selector = action === 'like'
    ? '.topic-list-vote-button, button[aria-label*="点赞"], button[title*="点赞"]'
    : 'button[aria-label*="回复"], button[title*="回复"]';
  const button = item.rawElementRef?.querySelector<HTMLElement>(selector);
  if (!button) return false;
  button.click();
  return true;
}

export class LinuxDoAdapter extends BaseAdapter {
  protected readonly cardSelector = CARD_SELECTOR;

  parseCard(element: Element): FeedItem | null {
    return parseLinuxDoCard(element);
  }

  triggerAction(item: FeedItem, action: FeedAction): boolean {
    return triggerLinuxDoAction(item, action);
  }
}

export const linuxDoAdapterDefinition: AdapterDefinition = {
  source: {
    id: 'linux-do',
    name: 'Linux DO',
    homeUrl: 'https://linux.do/',
    likeLabel: '点赞',
    commentLabel: '回复',
  },
  matches: (hostname) => hostname === 'linux.do' || hostname.endsWith('.linux.do'),
  create: (onItems) => new LinuxDoAdapter(onItems),
};
