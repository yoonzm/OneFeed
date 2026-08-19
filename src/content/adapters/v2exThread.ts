import DOMPurify from 'dompurify';
import type { ThreadDetail, ThreadHeader, ThreadPagination } from '../../types/detail';
import type { FeedBlock, FeedImage, ThreadEntry } from '../../types/feed';
import type { DetailAdapterDefinition, DetailListener } from './detail';
import { parseV2exCount, V2EX_SOURCE } from './v2ex';

function absoluteUrl(value: string): string {
  if (!value) return '';
  try {
    return new URL(value, window.location.href).href;
  } catch {
    return '';
  }
}

function extractImages(body: Element): FeedImage[] {
  const seen = new Set<string>();
  return Array.from(body.querySelectorAll('img'))
    .map((image) => ({
      url: absoluteUrl(image.getAttribute('src') || ''),
      alt: image.getAttribute('alt') || '',
    }))
    .filter((image) => {
      if (!image.url || seen.has(image.url)) return false;
      seen.add(image.url);
      return true;
    });
}

function parseBlocks(body: Element): FeedBlock[] {
  const clone = body.cloneNode(true) as Element;
  clone.querySelectorAll('img, script, style, button, svg, noscript').forEach((node) => node.remove());
  clone.querySelectorAll('[style], [class], [id]').forEach((node) => {
    node.removeAttribute('style');
    node.removeAttribute('class');
    node.removeAttribute('id');
  });
  const images = extractImages(body);
  const html = DOMPurify.sanitize(clone.innerHTML, {
    ALLOWED_TAGS: ['p', 'br', 'h2', 'h3', 'h4', 'strong', 'b', 'em', 'i', 'u', 's', 'blockquote', 'ol', 'ul', 'li', 'a', 'code', 'pre'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  });
  const textContainer = document.createElement('div');
  textContainer.innerHTML = html;
  const plainText = textContainer.textContent?.trim() || '';
  return [
    ...(plainText ? [{ type: 'richText' as const, html, plainText }] : []),
    ...(images.length ? [{ type: 'gallery' as const, items: images }] : []),
  ];
}

function firstNonEmptyLink(root: ParentNode, selector: string): HTMLAnchorElement | undefined {
  return Array.from(root.querySelectorAll<HTMLAnchorElement>(selector))
    .find((link) => link.textContent?.trim());
}

function pageUrl(url: URL, page: number): string {
  const next = new URL(url.href);
  next.hash = '';
  next.searchParams.set('p', String(page));
  return next.href;
}

function parsePagination(root: ParentNode, url: URL): ThreadPagination {
  const input = root.querySelector<HTMLInputElement>('.page_input');
  const currentPage = Number(root.querySelector('.page_current')?.textContent) ||
    Number(url.searchParams.get('p')) || 1;
  const totalPages = Number(input?.max) || currentPage;
  return {
    currentPage,
    totalPages,
    previousUrl: currentPage > 1 ? pageUrl(url, currentPage - 1) : undefined,
    nextUrl: currentPage < totalPages ? pageUrl(url, currentPage + 1) : undefined,
  };
}

export function isV2exThreadUrl(url: URL): boolean {
  return (url.hostname === 'v2ex.com' || url.hostname.endsWith('.v2ex.com')) &&
    /^\/t\/\d+\/?$/.test(url.pathname);
}

export function parseV2exReply(element: Element, url: URL): ThreadEntry | null {
  const body = element.querySelector('.reply_content');
  const replyId = element.id.match(/^r_(\d+)$/)?.[1];
  if (!body || !replyId) return null;

  const authorLink = firstNonEmptyLink(element, 'a.dark[href^="/member/"]');
  const avatar = element.querySelector<HTMLImageElement>('img.avatar');
  const authorName = authorLink?.textContent?.trim() || avatar?.alt?.trim() || 'V2EX 用户';
  const originalUrl = new URL(url.href);
  originalUrl.hash = element.id;
  const reactions = parseV2exCount(element.querySelector('.small.fade')?.textContent || '');

  return {
    id: `v2ex_reply_${replyId}`,
    platform: 'v2ex',
    source: V2EX_SOURCE,
    originalUrl: originalUrl.href,
    kind: 'post',
    role: 'reply',
    sequence: parseV2exCount(element.querySelector('.no')?.textContent || ''),
    author: {
      name: authorName,
      avatar: absoluteUrl(avatar?.getAttribute('src') || ''),
      link: authorLink
        ? absoluteUrl(authorLink.getAttribute('href') || '') || undefined
        : undefined,
    },
    publishedAt: element.querySelector('.ago')?.getAttribute('title') || undefined,
    body: parseBlocks(body),
    metrics: reactions ? [{ kind: 'reactions', value: reactions, label: '喜欢' }] : [],
    actions: [],
  };
}

export function parseV2exThread(
  root: ParentNode,
  url = new URL(window.location.href),
): ThreadDetail | null {
  const topicId = url.pathname.match(/^\/t\/(\d+)/)?.[1];
  const title = root.querySelector('#Main .header h1')?.textContent?.trim() || '';
  const body = root.querySelector('#Main .topic_content');
  if (!topicId || !title || !body) return null;

  const headerElement = root.querySelector('#Main .header')!;
  const authorLink = firstNonEmptyLink(headerElement, 'a[href^="/member/"]');
  const avatar = headerElement.querySelector<HTMLImageElement>('img.avatar');
  const communityLink = headerElement.querySelector<HTMLAnchorElement>('a[href^="/go/"]');
  const tags = Array.from(root.querySelectorAll<HTMLAnchorElement>('#Main a.tag')).map((tag) => ({
    name: tag.textContent?.replace(/^\s*[^\p{L}\p{N}]+/u, '').trim() || '',
    url: absoluteUrl(tag.getAttribute('href') || '') || undefined,
  })).filter((tag) => tag.name);
  const headerMeta = headerElement.querySelector('.gray')?.textContent || '';
  const replyMeta = Array.from(root.querySelectorAll('#Main .gray'))
    .map((element) => element.textContent || '')
    .find((text) => /repl(?:y|ies)/i.test(text)) || '';
  const reactions = parseV2exCount(headerElement.querySelector('.votes .vote')?.textContent || '');
  const replies = parseV2exCount(replyMeta);
  const views = parseV2exCount(headerMeta.match(/[\d,]+\s+views?/i)?.[0] || '');
  const rootId = `v2ex_topic_${topicId}`;
  const header: ThreadHeader = {
    id: rootId,
    role: 'topic',
    originalUrl: url.href,
    title,
    author: {
      name: authorLink?.textContent?.trim() || avatar?.alt?.trim() || 'V2EX 用户',
      avatar: absoluteUrl(avatar?.getAttribute('src') || ''),
      link: authorLink
        ? absoluteUrl(authorLink.getAttribute('href') || '') || undefined
        : undefined,
    },
    publishedAt: headerElement.querySelector('.gray [title]')?.getAttribute('title') || undefined,
    body: parseBlocks(body),
    context: communityLink || tags.length ? {
      community: communityLink ? {
        name: communityLink.textContent?.trim() || '',
        url: absoluteUrl(communityLink.getAttribute('href') || '') || undefined,
      } : undefined,
      tags,
    } : undefined,
    metrics: [
      ...(reactions ? [{ kind: 'reactions' as const, value: reactions, label: '赞同' }] : []),
      { kind: 'replies', value: replies, label: '回复' },
      ...(views ? [{ kind: 'views' as const, value: views, label: '浏览' }] : []),
    ],
    actions: [
      ...(headerElement.querySelector('.votes .vote') ? [{
        id: 'react',
        kind: 'react' as const,
        variant: 'agree' as const,
        label: '赞同',
        count: reactions,
        enabled: true,
        fallback: 'openOriginal' as const,
      }] : []),
      { id: 'open', kind: 'open', label: '查看原主题', enabled: true },
    ],
  };
  const entries = Array.from(root.querySelectorAll('#Main .cell[id^="r_"]'))
    .map((element) => parseV2exReply(element, url))
    .filter((item): item is ThreadEntry => item !== null);

  return {
    id: rootId,
    platform: 'v2ex',
    source: V2EX_SOURCE,
    originalUrl: url.href,
    kind: 'thread',
    header,
    entries,
    entryLabel: '回复',
    loadingMode: 'paged',
    pagination: parsePagination(root, url),
  };
}

export class V2exThreadAdapter {
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
    if (actionId !== 'react') return false;
    const control = this.runtimeElements.get(itemId)?.querySelector<HTMLElement>('.votes .vote');
    if (!control) return false;
    control.click();
    return true;
  }

  private processThread(): void {
    const url = new URL(window.location.href);
    const content = parseV2exThread(document, url);
    if (!content) return;

    this.runtimeElements.clear();
    const headerElement = document.querySelector('#Main .header');
    if (headerElement) this.runtimeElements.set(content.header.id, headerElement);
    document.querySelectorAll('#Main .cell[id^="r_"]').forEach((element) => {
      const item = parseV2exReply(element, url);
      if (item) this.runtimeElements.set(item.id, element);
    });
    this.onDetail(content);
  }
}

export const v2exThreadAdapterDefinition: DetailAdapterDefinition = {
  source: V2EX_SOURCE,
  surface: 'thread',
  matches: isV2exThreadUrl,
  create: (onDetail) => new V2exThreadAdapter(onDetail),
};
