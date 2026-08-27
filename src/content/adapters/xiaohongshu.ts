import { XIAOHONGSHU_PLATFORM } from '../../config/platforms';
import { i18n } from '../../i18n';
import type { FeedItem } from '../../types/feed';
import {
  BaseAdapter,
  type AdapterDefinition,
  type FeedPageContext,
  type RuntimeFeedChannelBinding,
} from './base';

const CARD_SELECTOR = 'section.note-item[data-note-id]';
const SUPPORTED_HOSTS = new Set(['xiaohongshu.com', 'www.xiaohongshu.com']);

export const XIAOHONGSHU_SOURCE = XIAOHONGSHU_PLATFORM;

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

export function parseXiaohongshuCount(value: string): number {
  const match = value.replace(/,/g, '').trim().match(/(\d+(?:\.\d+)?)\s*([万亿千]?)/);
  if (!match) return 0;
  const multipliers: Record<string, number> = {
    千: 1_000,
    万: 10_000,
    亿: 100_000_000,
  };
  return Math.round(Number(match[1]) * (multipliers[match[2] || ''] || 1));
}

export function parseXiaohongshuCard(
  element: Element,
  pageUrl = new URL(window.location.href),
): FeedItem | null {
  const noteId = element.getAttribute('data-note-id')?.trim() || '';
  const noteLink = element.querySelector<HTMLAnchorElement>(
    'a.cover[href*="/explore/"], a.title[href*="/explore/"]',
  );
  const originalUrl = absoluteUrl(noteLink?.getAttribute('href') || '', pageUrl);
  if (!noteId || !originalUrl) return null;

  const title = normalizedText(element.querySelector('a.title'));
  const authorLink = element.querySelector<HTMLAnchorElement>('a.author[href]');
  const cover = element.querySelector<HTMLImageElement>('a.cover img[src]');
  const coverUrl = absoluteUrl(cover?.getAttribute('src') || '', pageUrl);
  if (!title && !coverUrl) return null;

  const width = Number(element.getAttribute('data-width')) || undefined;
  const height = Number(element.getAttribute('data-height')) || undefined;
  const reactions = parseXiaohongshuCount(
    normalizedText(element.querySelector('.like-wrapper .count')),
  );
  const likeControl = element.querySelector<HTMLElement>('.like-wrapper');

  return {
    id: `xiaohongshu_${noteId}`,
    platform: 'xiaohongshu',
    source: XIAOHONGSHU_SOURCE,
    originalUrl,
    kind: 'post',
    role: 'post',
    title: title || undefined,
    author: {
      name: normalizedText(authorLink?.querySelector('.name')) || normalizedText(authorLink),
      avatar: absoluteUrl(
        authorLink?.querySelector('img[src]')?.getAttribute('src') || '',
        pageUrl,
      ),
      link: authorLink
        ? absoluteUrl(authorLink.getAttribute('href') || '', pageUrl) || undefined
        : undefined,
    },
    previewBlocks: coverUrl ? [{
      type: 'gallery',
      items: [{
        url: coverUrl,
        alt: cover?.getAttribute('alt') || title,
        width,
        height,
        aspectRatio: width && height ? width / height : undefined,
      }],
    }] : [],
    metrics: [{ kind: 'reactions', value: reactions, label: i18n.t('adapter.like') }],
    actions: [
      {
        id: 'react',
        kind: 'react',
        variant: 'like',
        label: i18n.t('adapter.like'),
        count: reactions,
        enabled: Boolean(likeControl),
        fallback: 'openOriginal',
      },
      { id: 'open', kind: 'open', label: i18n.t('adapter.openPost'), enabled: true },
    ],
  };
}

export function triggerXiaohongshuAction(
  element: Element | undefined,
  actionId: string,
): boolean {
  if (actionId !== 'react') return false;
  const control = element?.querySelector<HTMLElement>('.like-wrapper');
  if (!control) return false;
  control.click();
  return true;
}

export class XiaohongshuAdapter extends BaseAdapter {
  protected readonly cardSelector = CARD_SELECTOR;

  protected override getFeedChannelBindings(root: ParentNode): RuntimeFeedChannelBinding[] {
    // 频道没有链接，但稳定保留 channel ID；排除站点注入的无 ID 点击代理副本。
    return Array.from(
      root.querySelectorAll<HTMLElement>('.channel-container .channel[id]'),
    ).map((element) => ({
      channel: {
        id: element.id,
        label: normalizedText(element),
        active: element.classList.contains('active'),
      },
      element,
    })).filter(({ channel }) => Boolean(channel.label));
  }

  parseCard(element: Element, context: FeedPageContext): FeedItem | null {
    return parseXiaohongshuCard(element, context.url);
  }

  triggerAction(itemId: string, actionId: string): boolean {
    return triggerXiaohongshuAction(this.getRuntimeElement(itemId), actionId);
  }
}

export const xiaohongshuAdapterDefinition: AdapterDefinition = {
  source: XIAOHONGSHU_SOURCE,
  matches: (url) => SUPPORTED_HOSTS.has(url.hostname) &&
    ['/', '/explore'].includes(url.pathname.replace(/\/+$/, '') || '/'),
  create: (onItems) => new XiaohongshuAdapter(onItems),
};
