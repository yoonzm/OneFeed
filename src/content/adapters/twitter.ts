import DOMPurify from 'dompurify';
import type { FeedAction, FeedItem, FeedMedia } from '../../types/feed';
import { BaseAdapter, type AdapterDefinition } from './base';

const CARD_SELECTOR = 'article[data-testid="tweet"]';

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

export function parseTwitterCount(value: string): number {
  const normalized = value.replace(/,/g, '').trim();
  const match = normalized.match(/(\d+(?:\.\d+)?)\s*([KMB万千]?)/i);
  if (!match) return 0;

  const unit = match[2]?.toUpperCase() ?? '';
  const multipliers: Record<string, number> = {
    K: 1_000,
    M: 1_000_000,
    B: 1_000_000_000,
    千: 1_000,
    万: 10_000,
  };
  return Math.round(Number(match[1]) * (multipliers[unit] || 1));
}

function actionCount(element: Element, testId: string): number {
  const action = element.querySelector(`[data-testid="${testId}"]`);
  return parseTwitterCount(
    action?.getAttribute('aria-label') || action?.textContent || '',
  );
}

function cleanTweetText(body: Element | null): string {
  if (!body) return '';

  const clone = body.cloneNode(true) as Element;
  clone.querySelectorAll('img[alt]').forEach((image) => {
    image.replaceWith(document.createTextNode(image.getAttribute('alt') || ''));
  });
  clone.querySelectorAll('img, svg, button, video').forEach((node) => node.remove());
  clone.querySelectorAll('a').forEach((link) => {
    const href = absoluteUrl(link.getAttribute('href') || '');
    if (href) link.setAttribute('href', href);
    link.setAttribute('target', '_blank');
    link.setAttribute('rel', 'noreferrer');
  });
  clone.querySelectorAll('[style], [class], [id], [data-testid]').forEach((node) => {
    node.removeAttribute('style');
    node.removeAttribute('class');
    node.removeAttribute('id');
    node.removeAttribute('data-testid');
  });

  return DOMPurify.sanitize(clone.innerHTML, {
    ALLOWED_TAGS: ['span', 'br', 'strong', 'b', 'em', 'i', 'a'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  });
}

function extractMedia(element: Element): FeedMedia[] {
  const seen = new Set<string>();
  return Array.from(element.querySelectorAll('[data-testid="tweetPhoto"] img'))
    .map((image) => ({
      type: 'image' as const,
      url: absoluteUrl(image.getAttribute('src') || ''),
      alt: image.getAttribute('alt') || '',
    }))
    .filter((media) => {
      if (!media.url || seen.has(media.url)) return false;
      seen.add(media.url);
      return true;
    });
}

function getAuthor(element: Element): FeedItem['author'] {
  const userName = element.querySelector('[data-testid="User-Name"]');
  const profileLink = Array.from(userName?.querySelectorAll('a[href]') || [])
    .find((link) => {
      const href = link.getAttribute('href') || '';
      return /^\/[A-Za-z0-9_]+\/?$/.test(href);
    });
  const name = profileLink?.textContent?.trim() ||
    Array.from(userName?.querySelectorAll('span') || [])
      .map((span) => span.textContent?.trim() || '')
      .find((text) => text && !text.startsWith('@')) ||
    'X 用户';

  return {
    name,
    avatar: absoluteUrl(
      element.querySelector('[data-testid="Tweet-User-Avatar"] img')?.getAttribute('src') || '',
    ),
    link: profileLink
      ? absoluteUrl(profileLink.getAttribute('href') || '') || undefined
      : undefined,
  };
}

export function parseTwitterCard(element: Element): FeedItem | null {
  const body = element.querySelector('[data-testid="tweetText"]');
  const media = extractMedia(element);
  const contentText = body?.textContent?.trim() || '';
  if (!contentText && !media.length) return null;

  const time = element.querySelector('time');
  const statusLink = time?.closest('a[href*="/status/"]') ||
    element.querySelector('a[href*="/status/"]');
  const originalUrl = absoluteUrl(statusLink?.getAttribute('href') || '') || window.location.href;
  const author = getAuthor(element);
  const createdAt = time?.getAttribute('datetime') || undefined;
  const originId = originalUrl.match(/\/status\/(\d+)/)?.[1] ||
    stableHash(`${originalUrl}|${author.name}|${createdAt || ''}|${contentText}|${media[0]?.url || ''}`);

  return {
    id: `twitter_${originId}`,
    platform: 'twitter',
    originalUrl,
    author,
    createdAt,
    contentHtml: cleanTweetText(body),
    media,
    stats: {
      likes: actionCount(element, 'like') || actionCount(element, 'unlike'),
      comments: actionCount(element, 'reply'),
    },
    rawElementRef: element,
  };
}

export function triggerTwitterAction(item: FeedItem, action: FeedAction): boolean {
  const testId = action === 'like' ? 'like' : 'reply';
  const button = item.rawElementRef?.querySelector<HTMLElement>(`[data-testid="${testId}"]`);
  if (!button) return false;
  button.click();
  return true;
}

export class TwitterAdapter extends BaseAdapter {
  protected readonly cardSelector = CARD_SELECTOR;

  parseCard(element: Element): FeedItem | null {
    return parseTwitterCard(element);
  }

  triggerAction(item: FeedItem, action: FeedAction): boolean {
    return triggerTwitterAction(item, action);
  }

  protected override getCards(): Element[] {
    return super.getCards()
      .filter((card) => !card.parentElement?.closest(CARD_SELECTOR));
  }
}

export const twitterAdapterDefinition: AdapterDefinition = {
  source: {
    id: 'twitter',
    name: 'X',
    homeUrl: 'https://x.com/home',
    likeLabel: '喜欢',
    commentLabel: '回复',
  },
  matches: (hostname) => [
    'x.com',
    'twitter.com',
  ].some((domain) => hostname === domain || hostname.endsWith(`.${domain}`)),
  create: (onItems) => new TwitterAdapter(onItems),
};
