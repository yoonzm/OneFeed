import { HACKER_NEWS_PLATFORM } from '../../config/platforms';
import { i18n } from '../../i18n';
import type { FeedItem } from '../../types/feed';
import {
  BaseAdapter,
  type AdapterDefinition,
  type FeedPageContext,
} from './base';

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

function absoluteUrl(value: string, pageUrl: URL): string {
  if (!value) return '';
  try {
    return new URL(value, pageUrl).href;
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

export function parseHackerNewsCard(
  element: Element,
  pageUrl = new URL(window.location.href),
): FeedItem | null {
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
    originalUrl: absoluteUrl(titleLink.getAttribute('href') || '', pageUrl) || pageUrl.href,
    kind: 'discussion',
    role: 'topic',
    author: {
      name: authorLink?.textContent?.trim() || 'Hacker News',
      avatar: '',
      link: authorLink
        ? absoluteUrl(authorLink.getAttribute('href') || '', pageUrl) || undefined
        : undefined,
    },
    sequence: parseHackerNewsCount(element.querySelector('.rank')?.textContent || '') || undefined,
    context: siteName ? {
      community: {
        name: siteName,
        url: absoluteUrl(siteLink?.getAttribute('href') || '', pageUrl) || undefined,
      },
    } : undefined,
    publishedAt: parsePublishedAt(metadataRow),
    title,
    previewBlocks: [],
    metrics: scoreElement ? [{ kind: 'score', value: score, label: i18n.t('adapter.score') }] : [],
    actions: [
      ...(voteLink ? [{
        id: 'react',
        kind: 'react' as const,
        variant: 'upvote' as const,
        label: i18n.t('adapter.agree'),
        enabled: true,
        fallback: 'openOriginal' as const,
      }] : []),
      ...(commentsLink ? [{
        id: 'reply',
        kind: 'reply' as const,
        label: i18n.t('adapter.comments'),
        count: replies,
        enabled: true,
        fallback: 'openOriginal' as const,
      }] : []),
      { id: 'open', kind: 'open', label: i18n.t('adapter.openOriginal'), enabled: true },
    ],
  };
}

export function triggerHackerNewsAction(
  element: Element | undefined,
  actionId: string,
  pageUrl = new URL(window.location.href),
  live = element?.isConnected ?? false,
): boolean {
  const target = actionId === 'react'
    ? element?.querySelector<HTMLAnchorElement>('a[id^="up_"]')
    : actionId === 'reply'
      ? getCommentsLink(element ? getMetadataRow(element) : null)
      : undefined;
  if (!target) return false;
  if (live && target.isConnected) {
    target.click();
    return true;
  }

  // 抓取页中的控件未挂载到真实文档，改为打开其原站目标，避免离线 click 静默失效。
  const targetUrl = absoluteUrl(target.getAttribute('href') || '', pageUrl);
  if (!targetUrl) return false;
  window.open(targetUrl, '_blank', 'noopener,noreferrer');
  return true;
}

export class HackerNewsAdapter extends BaseAdapter {
  protected readonly cardSelector = CARD_SELECTOR;
  protected override readonly loadingStrategy = {
    kind: 'document-page',
    nextSelector: 'a.morelink[rel="next"]',
  } as const;

  parseCard(element: Element, context: FeedPageContext): FeedItem | null {
    return parseHackerNewsCard(element, context.url);
  }

  triggerAction(itemId: string, actionId: string): boolean {
    const binding = this.getRuntimeBinding(itemId);
    return triggerHackerNewsAction(
      binding?.element,
      actionId,
      binding?.pageUrl,
      binding?.live,
    );
  }
}

export const hackerNewsAdapterDefinition: AdapterDefinition = {
  source: HACKER_NEWS_SOURCE,
  matches: (url) => url.hostname === 'news.ycombinator.com' && SUPPORTED_PATHS.has(url.pathname),
  create: (onItems) => new HackerNewsAdapter(onItems),
};
