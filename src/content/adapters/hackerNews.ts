import { HACKER_NEWS_PLATFORM } from '../../config/platforms';
import type { FeedItem } from '../../types/feed';
import { BaseAdapter, type AdapterDefinition } from './base';

const CARD_SELECTOR = 'tr.athing.submission[id]';
const SUPPORTED_PATHS = new Set([
  '/',
  '/news',
  '/newest',
  '/front',
  '/best',
  '/ask',
  '/show',
  '/jobs',
]);

export const HACKER_NEWS_SOURCE = HACKER_NEWS_PLATFORM;

function absoluteUrl(value: string): string {
  if (!value) return '';
  try {
    return new URL(value, window.location.origin).href;
  } catch {
    return '';
  }
}

/** 忽略翻译扩展注入的副本，避免标题在 OneFeed 中重复出现。 */
function originalText(element: Element): string {
  const clone = element.cloneNode(true) as Element;
  clone.querySelectorAll(
    '[data-read-frog-translation-mode], .read-frog-translated-content-wrapper',
  ).forEach((injected) => injected.remove());
  return clone.textContent?.replace(/\s+/g, ' ').trim() || '';
}

export function parseHackerNewsCount(value: string): number {
  const match = value.replace(/,/g, '').match(/\d+/);
  return match ? Number(match[0]) : 0;
}

function getMetadataRow(element: Element): Element | null {
  return element.nextElementSibling?.querySelector('.subtext')
    ? element.nextElementSibling
    : null;
}

function getCommentsLink(metadataRow: Element | null): HTMLAnchorElement | undefined {
  return Array.from(metadataRow?.querySelectorAll<HTMLAnchorElement>('a[href^="item?id="]') || [])
    .find((link) => !link.closest('.age') && /comment|discuss/i.test(link.textContent || ''));
}

function parsePublishedAt(metadataRow: Element | null): number | undefined {
  const title = metadataRow?.querySelector('.age')?.getAttribute('title') || '';
  const epochSeconds = Number(title.trim().split(/\s+/).at(-1));
  return Number.isFinite(epochSeconds) && epochSeconds > 0
    ? epochSeconds * 1_000
    : undefined;
}

export function parseHackerNewsCard(element: Element): FeedItem | null {
  const titleLink = element.querySelector<HTMLAnchorElement>('.titleline > a');
  const title = titleLink ? originalText(titleLink) : '';
  const originId = element.getAttribute('id')?.trim() || '';
  if (!titleLink || !title || !originId) return null;

  const metadataRow = getMetadataRow(element);
  const authorLink = metadataRow?.querySelector<HTMLAnchorElement>('a.hnuser');
  const scoreElement = metadataRow?.querySelector('.score');
  const commentsLink = getCommentsLink(metadataRow);
  const voteLink = element.querySelector<HTMLAnchorElement>('a[id^="up_"]');
  const siteLink = element.querySelector<HTMLAnchorElement>('.sitebit > a');
  const siteName = element.querySelector('.sitestr')?.textContent?.trim() || '';
  const score = parseHackerNewsCount(scoreElement?.textContent || '');
  const replies = parseHackerNewsCount(commentsLink?.textContent || '');

  return {
    id: `hacker-news_${originId}`,
    platform: 'hacker-news',
    source: HACKER_NEWS_SOURCE,
    originalUrl: absoluteUrl(titleLink.getAttribute('href') || '') || window.location.href,
    kind: 'discussion',
    role: 'topic',
    author: {
      name: authorLink?.textContent?.trim() || 'Hacker News',
      avatar: '',
      link: authorLink
        ? absoluteUrl(authorLink.getAttribute('href') || '') || undefined
        : undefined,
    },
    sequence: parseHackerNewsCount(element.querySelector('.rank')?.textContent || '') || undefined,
    context: siteName ? {
      community: {
        name: siteName,
        url: absoluteUrl(siteLink?.getAttribute('href') || '') || undefined,
      },
    } : undefined,
    publishedAt: parsePublishedAt(metadataRow),
    title,
    previewBlocks: [],
    metrics: scoreElement ? [{ kind: 'score', value: score, label: '分数' }] : [],
    actions: [
      ...(voteLink ? [{
        id: 'react',
        kind: 'react' as const,
        variant: 'upvote' as const,
        label: '赞同',
        enabled: true,
        fallback: 'openOriginal' as const,
      }] : []),
      ...(commentsLink ? [{
        id: 'reply',
        kind: 'reply' as const,
        label: '评论',
        count: replies,
        enabled: true,
        fallback: 'openOriginal' as const,
      }] : []),
      { id: 'open', kind: 'open', label: '查看原文', enabled: true },
    ],
  };
}

export function triggerHackerNewsAction(
  element: Element | undefined,
  actionId: string,
): boolean {
  const target = actionId === 'react'
    ? element?.querySelector<HTMLElement>('a[id^="up_"]')
    : actionId === 'reply'
      ? getCommentsLink(element ? getMetadataRow(element) : null)
      : undefined;
  if (!target) return false;
  target.click();
  return true;
}

export class HackerNewsAdapter extends BaseAdapter {
  protected readonly cardSelector = CARD_SELECTOR;

  parseCard(element: Element): FeedItem | null {
    return parseHackerNewsCard(element);
  }

  triggerAction(itemId: string, actionId: string): boolean {
    return triggerHackerNewsAction(this.getRuntimeElement(itemId), actionId);
  }
}

export const hackerNewsAdapterDefinition: AdapterDefinition = {
  source: HACKER_NEWS_SOURCE,
  matches: (url) => url.hostname === 'news.ycombinator.com' && SUPPORTED_PATHS.has(url.pathname),
  create: (onItems) => new HackerNewsAdapter(onItems),
};
