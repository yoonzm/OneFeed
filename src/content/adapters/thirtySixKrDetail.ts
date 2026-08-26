import DOMPurify from 'dompurify';
import type { ArticleDetail } from '../../types/detail';
import type { FeedBlock, FeedImage } from '../../types/feed';
import type { DetailAdapterDefinition, DetailListener } from './detail';
import { THIRTY_SIX_KR_SOURCE } from './thirtySixKr';

const ARTICLE_SELECTOR = '.article-wrapper';
const BODY_SELECTOR = '.articleDetailContent.kr-rich-text-wrapper, .articleDetailContent';

interface ThirtySixKrArticleData {
  itemId?: string | number;
  widgetTitle?: string;
  author?: string;
  authorId?: string | number;
  authorFace?: string;
  publishTime?: string | number;
  widgetContent?: string;
}

interface ThirtySixKrInitialState {
  articleDetail?: {
    articleDetailData?: {
      data?: ThirtySixKrArticleData;
    };
  };
}

type OrderedSegment =
  | { type: 'content'; node: Node }
  | { type: 'gallery'; items: FeedImage[] };

type RichTextBlock = Extract<FeedBlock, { type: 'richText' }>;

function absoluteUrl(value: string, pageUrl: URL): string {
  if (!value) return '';
  try {
    return new URL(value, pageUrl).href;
  } catch {
    return '';
  }
}

function normalizedText(element: Element | null): string {
  return element?.textContent?.replace(/\s+/g, ' ').trim() || '';
}

function readInitialState(root: ParentNode): ThirtySixKrInitialState | undefined {
  const marker = 'window.initialState=';
  const script = Array.from(root.querySelectorAll('script'))
    .find((candidate) => candidate.textContent?.includes(marker));
  const scriptText = script?.textContent || '';
  const start = scriptText.indexOf(marker);
  if (start < 0) return undefined;

  try {
    const json = scriptText.slice(start + marker.length).trim().replace(/;$/, '');
    return JSON.parse(json) as ThirtySixKrInitialState;
  } catch {
    return undefined;
  }
}

function readArticleData(root: ParentNode): ThirtySixKrArticleData | undefined {
  return readInitialState(root)?.articleDetail?.articleDetailData?.data;
}

export function isThirtySixKrDetailUrl(url: URL): boolean {
  return ['36kr.com', 'www.36kr.com'].includes(url.hostname) &&
    /^\/p\/\d+\/?$/.test(url.pathname);
}

export function findThirtySixKrDetailRoot(root: ParentNode, url: URL): Element | null {
  const articleId = url.pathname.match(/^\/p\/(\d+)/)?.[1];
  if (!articleId) return null;
  const data = readArticleData(root);
  if (data?.itemId !== undefined && String(data.itemId) !== articleId) return null;

  if (data?.itemId === undefined) {
    const canonicalValue = root.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href ||
      root.querySelector<HTMLMetaElement>('meta[property="og:url"]')?.content;
    if (!canonicalValue) return null;
    try {
      if (new URL(canonicalValue, url).pathname.replace(/\/$/, '') !==
        url.pathname.replace(/\/$/, '')) return null;
    } catch {
      return null;
    }
  }

  return Array.from(root.querySelectorAll(ARTICLE_SELECTOR)).find((element) => (
    Boolean(element.querySelector('.article-title')) &&
    (Boolean(element.querySelector(BODY_SELECTOR)) || Boolean(data?.widgetContent?.trim()))
  )) || null;
}

function extractImage(element: Element, pageUrl: URL): FeedImage | null {
  const url = absoluteUrl(
    element.getAttribute('data-src') ||
      element.getAttribute('data-original') ||
      element.getAttribute('src') ||
      '',
    pageUrl,
  );
  if (!url) return null;

  const size = element.getAttribute('data-img-size-val')
    ?.split(',')
    .map((value) => Number(value.trim()));
  const width = size?.[0] || Number(element.getAttribute('width')) || undefined;
  const height = size?.[1] || Number(element.getAttribute('height')) || undefined;
  const image: FeedImage = {
    url,
    alt: element.getAttribute('alt') || '',
  };
  if (width && height) {
    image.width = width;
    image.height = height;
    image.aspectRatio = width / height;
  }
  return image;
}

function splitContentNode(node: Node, pageUrl: URL): OrderedSegment[] {
  if (node.nodeType === Node.TEXT_NODE) {
    return [{ type: 'content', node: node.cloneNode(true) }];
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return [];

  const element = node as Element;
  if (element.matches('img')) {
    const image = extractImage(element, pageUrl);
    return image ? [{ type: 'gallery', items: [image] }] : [];
  }

  const clone = () => element.cloneNode(false) as Element;
  let content = clone();
  const segments: OrderedSegment[] = [];
  if (!element.childNodes.length) {
    return [{ type: 'content', node: content }];
  }

  Array.from(element.childNodes).forEach((child) => {
    splitContentNode(child, pageUrl).forEach((segment) => {
      if (segment.type === 'content') {
        content.append(segment.node);
        return;
      }

      if (content.childNodes.length) {
        segments.push({ type: 'content', node: content });
      }
      segments.push(segment);
      content = clone();
    });
  });

  if (content.childNodes.length) {
    segments.push({ type: 'content', node: content });
  }
  return segments;
}

function createRichTextBlock(nodes: Node[], pageUrl: URL): RichTextBlock | null {
  const container = document.createElement('div');
  container.append(...nodes);
  container.querySelectorAll('a[href]').forEach((link) => {
    const href = absoluteUrl(link.getAttribute('href') || '', pageUrl);
    if (href) {
      link.setAttribute('href', href);
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noreferrer');
    } else {
      link.removeAttribute('href');
    }
  });
  container.querySelectorAll('[style], [class], [id]').forEach((node) => {
    node.removeAttribute('style');
    node.removeAttribute('class');
    node.removeAttribute('id');
  });

  const html = DOMPurify.sanitize(container.innerHTML, {
    ALLOWED_TAGS: [
      'p', 'br', 'h2', 'h3', 'h4', 'strong', 'b', 'em', 'i', 'u', 's',
      'span', 'blockquote', 'ol', 'ul', 'li', 'a', 'code', 'pre', 'figure',
      'figcaption', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'colspan', 'rowspan'],
  });
  const textContainer = document.createElement('div');
  textContainer.innerHTML = html;
  const plainText = textContainer.textContent?.replace(/\s+/g, ' ').trim() || '';
  return plainText ? { type: 'richText', html, plainText } : null;
}

/** 详情正文按原 DOM 流切分 Block，防止图片被统一移动到文章末尾。 */
export function parseThirtySixKrDetailBlocks(body: Element, pageUrl: URL): FeedBlock[] {
  const blocks: FeedBlock[] = [];
  const knownImageUrls = new Set<string>();
  let contentNodes: Node[] = [];

  const flushContent = () => {
    if (!contentNodes.length) return;
    const block = createRichTextBlock(contentNodes, pageUrl);
    if (block) blocks.push(block);
    contentNodes = [];
  };

  Array.from(body.childNodes).forEach((node) => {
    splitContentNode(node, pageUrl).forEach((segment) => {
      if (segment.type === 'content') {
        contentNodes.push(segment.node);
        return;
      }

      flushContent();
      const items = segment.items.filter((image) => {
        if (knownImageUrls.has(image.url)) return false;
        knownImageUrls.add(image.url);
        return true;
      });
      if (items.length) blocks.push({ type: 'gallery', items });
    });
  });
  flushContent();
  return blocks;
}

function publishedAt(data: ThirtySixKrArticleData | undefined, element: Element) {
  if (typeof data?.publishTime === 'number' && Number.isFinite(data.publishTime)) {
    return data.publishTime;
  }
  if (typeof data?.publishTime === 'string' && data.publishTime.trim()) {
    const numeric = Number(data.publishTime);
    return Number.isFinite(numeric) ? numeric : data.publishTime;
  }
  return normalizedText(element.querySelector('.article-title-icon .item-time'))
    .replace(/^·\s*/, '') || undefined;
}

export function parseThirtySixKrDetail(
  element: Element,
  url = new URL(window.location.href),
  root: ParentNode = document,
): ArticleDetail | null {
  const articleId = url.pathname.match(/^\/p\/(\d+)/)?.[1];
  if (!articleId) return null;
  const data = readArticleData(root);
  if (data?.itemId !== undefined && String(data.itemId) !== articleId) return null;

  const title = normalizedText(element.querySelector('.article-title')) ||
    data?.widgetTitle?.trim() || '';
  const authorLink = element.querySelector<HTMLAnchorElement>(
    '.article-title-icon a[href^="/user/"]',
  );
  const authorName = normalizedText(authorLink) || data?.author?.trim() || '';
  const bodyElement = element.querySelector(BODY_SELECTOR) || (() => {
    if (!data?.widgetContent?.trim()) return null;
    const fallback = document.createElement('div');
    fallback.innerHTML = data.widgetContent;
    return fallback;
  })();
  if (!title || !bodyElement) return null;

  const body = parseThirtySixKrDetailBlocks(bodyElement, url);
  if (!body.length) return null;

  return {
    id: `36kr_${articleId}`,
    platform: '36kr',
    source: THIRTY_SIX_KR_SOURCE,
    originalUrl: url.href,
    kind: 'article',
    role: 'article',
    title,
    author: {
      name: authorName,
      avatar: absoluteUrl(data?.authorFace || '', url),
      link: absoluteUrl(
        authorLink?.getAttribute('href') ||
          (data?.authorId !== undefined ? `/user/${data.authorId}` : ''),
        url,
      ) || undefined,
    },
    publishedAt: publishedAt(data, element),
    body,
  };
}

export class ThirtySixKrDetailAdapter {
  private observer?: MutationObserver;
  private timer?: number;

  constructor(private readonly onDetail: DetailListener) {}

  init(): void {
    this.observer = new MutationObserver(() => {
      window.clearTimeout(this.timer);
      this.timer = window.setTimeout(() => this.processDetail(), 120);
    });
    this.observer.observe(document.body, { childList: true, subtree: true });
    this.processDetail();
  }

  disconnect(): void {
    this.observer?.disconnect();
    window.clearTimeout(this.timer);
  }

  triggerAction(itemId: string, actionId: string): boolean {
    void itemId;
    void actionId;
    return false;
  }

  private processDetail(): void {
    const url = new URL(window.location.href);
    const element = findThirtySixKrDetailRoot(document, url);
    if (!element) return;
    const content = parseThirtySixKrDetail(element, url);
    if (content) this.onDetail(content);
  }
}

export const thirtySixKrDetailAdapterDefinition: DetailAdapterDefinition = {
  source: THIRTY_SIX_KR_SOURCE,
  surface: 'article',
  matches: isThirtySixKrDetailUrl,
  create: (onDetail) => new ThirtySixKrDetailAdapter(onDetail),
};
