import DOMPurify from 'dompurify';
import type { ThreadDetail, ThreadHeader } from '../../types/detail';
import type { FeedBlock, FeedImage, ThreadEntry } from '../../types/feed';
import type { DetailAdapterDefinition, DetailListener } from './detail';
import {
  LINUX_DO_SOURCE,
  parseLinuxDoCount,
  triggerLinuxDoAction,
} from './linuxDo';

const POST_SELECTOR = '.topic-post[data-post-number]';

function absoluteUrl(value: string): string {
  if (!value) return '';
  try {
    return new URL(value, window.location.href).href;
  } catch {
    return '';
  }
}

function topicIdFromUrl(url: URL): string | undefined {
  return url.pathname.match(/^\/t\/(?:[^/]+\/)?(\d+)(?:\/\d+)?\/?$/)?.[1];
}

function parseImages(body: Element): FeedImage[] {
  const seen = new Set<string>();
  return Array.from(body.querySelectorAll<HTMLImageElement>('img:not(.emoji):not(.site-icon)'))
    .map((image) => ({
      url: absoluteUrl(image.getAttribute('src') || ''),
      alt: image.getAttribute('alt') || '',
      width: Number(image.getAttribute('width')) || undefined,
      height: Number(image.getAttribute('height')) || undefined,
    }))
    .filter((image) => {
      if (!image.url || seen.has(image.url)) return false;
      seen.add(image.url);
      return true;
    });
}

function parseBlocks(body: Element): FeedBlock[] {
  const clone = body.cloneNode(true) as Element;
  clone.querySelectorAll(
    'img, script, style, button, svg, noscript, .cooked-selection-barrier',
  ).forEach((node) => node.remove());
  clone.querySelectorAll('[style], [class], [id]').forEach((node) => {
    node.removeAttribute('style');
    node.removeAttribute('class');
    node.removeAttribute('id');
  });

  const html = DOMPurify.sanitize(clone.innerHTML, {
    ALLOWED_TAGS: [
      'p', 'br', 'h2', 'h3', 'h4', 'strong', 'b', 'em', 'i', 'u', 's',
      'blockquote', 'ol', 'ul', 'li', 'a', 'code', 'pre',
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  });
  const textContainer = document.createElement('div');
  textContainer.innerHTML = html;
  const plainText = textContainer.textContent?.trim() || '';
  const images = parseImages(body);

  return [
    ...(plainText ? [{ type: 'richText' as const, html, plainText }] : []),
    ...(images.length ? [{ type: 'gallery' as const, items: images }] : []),
  ];
}

function parseAuthor(element: Element): ThreadEntry['author'] {
  const authorLink = element.querySelector<HTMLAnchorElement>(
    '.names .first a[data-user-card], .names a[data-user-card], .main-avatar[data-user-card]',
  );
  const avatar = element.querySelector<HTMLImageElement>('.topic-avatar img.avatar');

  return {
    name: authorLink?.textContent?.trim() ||
      authorLink?.getAttribute('data-user-card') ||
      'Linux DO 用户',
    avatar: absoluteUrl(avatar?.getAttribute('src') || ''),
    link: authorLink
      ? absoluteUrl(authorLink.getAttribute('href') || '') || undefined
      : undefined,
  };
}

export function isLinuxDoThreadUrl(url: URL): boolean {
  return (url.hostname === 'linux.do' || url.hostname.endsWith('.linux.do')) &&
    topicIdFromUrl(url) !== undefined;
}

export function findLinuxDoPostElements(root: ParentNode): Element[] {
  return Array.from(root.querySelectorAll(POST_SELECTOR));
}

export function parseLinuxDoPost(
  element: Element,
  topicId: string,
  topicUrl: string,
): ThreadEntry | null {
  const sequence = Number(element.getAttribute('data-post-number'));
  const article = element.querySelector<HTMLElement>('article[data-post-id]');
  const body = element.querySelector('.cooked');
  if (!article || !body || !Number.isFinite(sequence)) return null;

  const postId = article.getAttribute('data-post-id') || `${topicId}_${sequence}`;
  const postLink = element.querySelector<HTMLAnchorElement>('.post-date[href^="/t/"]');
  const fallbackUrl = sequence === 1
    ? topicUrl
    : `${topicUrl.replace(/\/$/, '')}/${sequence}`;
  const reactions = parseLinuxDoCount(
    element.querySelector('.reactions-counter')?.textContent || '',
  );
  const publishedAt = Number(
    element.querySelector('.relative-date[data-time]')?.getAttribute('data-time'),
  );
  const canReact = Boolean(element.querySelector(
    '.btn-toggle-reaction-like, button[aria-label*="点赞"], button[title*="点赞"]',
  ));

  return {
    id: `linux-do_post_${postId}`,
    platform: 'linux-do',
    source: LINUX_DO_SOURCE,
    originalUrl: absoluteUrl(postLink?.getAttribute('href') || '') || fallbackUrl,
    kind: 'post',
    role: 'reply',
    sequence,
    author: parseAuthor(element),
    publishedAt: Number.isFinite(publishedAt) ? publishedAt : undefined,
    body: parseBlocks(body),
    metrics: reactions
      ? [{ kind: 'reactions', value: reactions, label: '赞' }]
      : [],
    actions: [
      ...(canReact ? [{
        id: 'react',
        kind: 'react' as const,
        variant: 'like' as const,
        label: '点赞',
        count: reactions,
        enabled: true,
        fallback: 'openOriginal' as const,
      }] : []),
      { id: 'open', kind: 'open', label: '查看原帖', enabled: true },
    ],
  };
}

export function parseLinuxDoThread(
  root: ParentNode,
  url = new URL(window.location.href),
): ThreadDetail | null {
  const topicId = topicIdFromUrl(url);
  const titleLink = root.querySelector<HTMLAnchorElement>(
    'h1 .fancy-title, h1.header-title .topic-link, h1 a[data-topic-id]',
  );
  const title = titleLink?.textContent?.trim() || '';
  const postElements = findLinuxDoPostElements(root);
  if (!topicId || !title || !postElements.length) return null;

  const topicUrl = absoluteUrl(titleLink?.getAttribute('href') || '') ||
    new URL(`/t/topic/${topicId}`, url.origin).href;
  const parsedPosts = postElements
    .map((element) => ({
      element,
      item: parseLinuxDoPost(element, topicId, topicUrl),
    }))
    .filter((entry): entry is { element: Element; item: ThreadEntry } => entry.item !== null);
  const firstPost = parsedPosts.find(({ item }) => item.sequence === 1);
  const entries = parsedPosts
    .map(({ item }) => item)
    .filter((item) => item.sequence !== 1);
  const totalPosts = parseLinuxDoCount(
    root.querySelector('.topic-timeline .timeline-replies')?.textContent?.split('/').at(-1) || '',
  );
  const replies = totalPosts ? Math.max(0, totalPosts - 1) : entries.length;
  const reactions = parseLinuxDoCount(
    root.querySelector('.topic-map__likes-trigger .number')?.textContent || '',
  );
  const views = parseLinuxDoCount(
    root.querySelector('.topic-map__views-trigger .number')?.textContent || '',
  );
  const categoryLink = root.querySelector<HTMLAnchorElement>(
    '.topic-category .badge-category__wrapper[href]',
  );
  const categoryName = categoryLink?.querySelector('.badge-category__name')?.textContent?.trim() ||
    categoryLink?.textContent?.trim() || '';
  const tags = Array.from(
    root.querySelectorAll<HTMLAnchorElement>('.topic-category .discourse-tag[href]'),
  ).map((tag) => ({
    name: tag.textContent?.trim() || '',
    url: absoluteUrl(tag.getAttribute('href') || '') || undefined,
  })).filter((tag) => tag.name);
  const headerId = `linux-do_topic_${topicId}`;
  const header: ThreadHeader = {
    id: headerId,
    role: 'topic',
    originalUrl: topicUrl,
    title,
    author: firstPost?.item.author,
    publishedAt: firstPost?.item.publishedAt,
    body: firstPost?.item.body || [],
    context: categoryName || tags.length ? {
      community: categoryName ? {
        name: categoryName,
        url: absoluteUrl(categoryLink?.getAttribute('href') || '') || undefined,
      } : undefined,
      tags,
    } : undefined,
    metrics: [
      ...(reactions ? [{ kind: 'reactions' as const, value: reactions, label: '赞' }] : []),
      { kind: 'replies', value: replies, label: '回复' },
      ...(views ? [{ kind: 'views' as const, value: views, label: '浏览' }] : []),
    ],
    actions: [
      ...(firstPost?.item.actions.filter((action) => action.kind === 'react') || []),
      { id: 'open', kind: 'open', label: '查看原主题', enabled: true },
    ],
  };

  return {
    id: headerId,
    platform: 'linux-do',
    source: LINUX_DO_SOURCE,
    originalUrl: topicUrl,
    kind: 'thread',
    header,
    entries,
    entryLabel: '回复',
    loadingMode: 'infinite',
  };
}

export class LinuxDoThreadAdapter {
  private observer?: MutationObserver;
  private timer?: number;
  private readonly runtimeElements = new Map<string, Element>();

  constructor(private readonly onDetail: DetailListener) {}

  init(): void {
    this.processThread();
    this.observer = new MutationObserver(() => {
      window.clearTimeout(this.timer);
      this.timer = window.setTimeout(() => this.processThread(), 120);
    });
    this.observer.observe(document.body, { childList: true, subtree: true });
  }

  disconnect(): void {
    this.observer?.disconnect();
    window.clearTimeout(this.timer);
    this.runtimeElements.clear();
  }

  triggerAction(itemId: string, actionId: string): boolean {
    return triggerLinuxDoAction(this.runtimeElements.get(itemId), actionId);
  }

  private processThread(): void {
    const url = new URL(window.location.href);
    const topicId = topicIdFromUrl(url);
    const content = parseLinuxDoThread(document, url);
    if (!topicId || !content) return;

    this.runtimeElements.clear();
    findLinuxDoPostElements(document).forEach((element) => {
      const item = parseLinuxDoPost(element, topicId, content.originalUrl);
      if (!item) return;
      this.runtimeElements.set(item.id, element);
      if (item.sequence === 1) this.runtimeElements.set(content.header.id, element);
    });
    this.onDetail(content);
  }
}

export const linuxDoThreadAdapterDefinition: DetailAdapterDefinition = {
  source: LINUX_DO_SOURCE,
  surface: 'thread',
  matches: isLinuxDoThreadUrl,
  create: (onDetail) => new LinuxDoThreadAdapter(onDetail),
};
