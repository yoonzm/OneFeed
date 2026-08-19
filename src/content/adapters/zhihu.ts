import DOMPurify from 'dompurify';
import { ZHIHU_PLATFORM } from '../../config/platforms';
import type {
  FeedActionDescriptor,
  FeedAuthor,
  FeedBlock,
  FeedImage,
  FeedItem,
  FeedMetric,
} from '../../types/feed';
import {
  BaseAdapter,
  collectFeedChannelBindings,
  type AdapterDefinition,
  type RuntimeFeedChannelBinding,
} from './base';

const CARD_SELECTOR = [
  '.TopstoryItem',
  '.AnswerItem',
  '.ArticleItem',
  '.ContentItem',
  '.HotItem',
].join(', ');

const FEED_CHANNEL_PATHS = new Set(['/', '/follow', '/hot', '/recommend']);

const BODY_SELECTOR = [
  '.RichContent-inner',
  '.Post-RichText',
  '.RichText',
  '.CopyrightRichText-richText',
  '.ContentItem-content',
].join(', ');

type ZhihuActionId = 'react' | 'downvote' | 'reply' | 'bookmark' | 'like';

const ACTION_SELECTORS: Record<ZhihuActionId, string[]> = {
  react: [
    'button.VoteButton:not(.VoteButton--down)',
    '.Button--voteUp',
    'button[aria-label*="赞同"]',
  ],
  downvote: [
    'button.VoteButton--down',
    '.Button--voteDown',
    'button[aria-label*="反对"]',
    'button[aria-label*="踩"]',
  ],
  reply: ['button[aria-label*="评论"]'],
  bookmark: ['button[aria-label*="收藏"]'],
  like: ['button[aria-label*="喜欢"]'],
};

const ACTION_LABELS: Record<ZhihuActionId, string[]> = {
  react: ['赞同'],
  downvote: ['踩', '反对'],
  reply: ['评论'],
  bookmark: ['收藏'],
  like: ['喜欢'],
};

export const ZHIHU_SOURCE = ZHIHU_PLATFORM;

function firstText(element: Element, selectors: string[]): string {
  for (const selector of selectors) {
    const text = element.querySelector(selector)?.textContent?.trim();
    if (text) return text;
  }
  return '';
}

function firstAttribute(
  element: Element,
  selectors: string[],
  attribute: string,
): string {
  for (const selector of selectors) {
    const value = element.querySelector(selector)?.getAttribute(attribute)?.trim();
    if (value) return value;
  }
  return '';
}

function findActionControl(element: Element, actionId: ZhihuActionId): HTMLElement | null {
  for (const selector of ACTION_SELECTORS[actionId]) {
    const control = element.querySelector<HTMLElement>(selector);
    if (control) return control;
  }

  return Array.from(element.querySelectorAll<HTMLElement>('button, [role="button"]'))
    .find((control) => {
      const label = `${control.getAttribute('aria-label') || ''} ${control.textContent || ''}`;
      return ACTION_LABELS[actionId].some((keyword) => label.includes(keyword));
    }) || null;
}

function actionControlText(element: Element, actionId: ZhihuActionId): string {
  const control = findActionControl(element, actionId);
  if (!control) return '';
  return [
    control.getAttribute('aria-label'),
    control.getAttribute('title'),
    control.textContent,
  ].filter(Boolean).join(' ');
}

function absoluteUrl(value: string): string {
  if (!value) return '';
  try {
    return new URL(value, window.location.origin).href;
  } catch {
    return '';
  }
}

export function parseCount(value: string): number {
  const normalized = value.replace(/,/g, '').trim();
  const match = normalized.match(/(\d+(?:\.\d+)?)\s*([万千]?)/);
  if (!match) return 0;

  const multiplier = match[2] === '万' ? 10000 : match[2] === '千' ? 1000 : 1;
  return Math.round(Number(match[1]) * multiplier);
}

function stableHash(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

interface ZhihuMetadata {
  authorName?: string;
  itemId?: string;
  title?: string;
  type?: string;
  dateCreated?: string | number;
  datePublished?: string | number;
  dateModified?: string | number;
}

function getMetadata(element: Element): ZhihuMetadata {
  const value = element.getAttribute('data-zop') ||
    element.querySelector('[data-zop]')?.getAttribute('data-zop');
  if (!value) return {};

  try {
    return JSON.parse(value) as ZhihuMetadata;
  } catch {
    return {};
  }
}

function getOriginalUrl(element: Element): string {
  const link = firstAttribute(
    element,
    [
      '.ContentItem-title a',
      '.QuestionItem-title a',
      'meta[itemprop="url"]',
      'a[href*="/question/"]',
      'a[href*="/p/"]',
    ],
    'href',
  );
  return absoluteUrl(link) || window.location.href;
}

function extractMedia(body: Element): FeedImage[] {
  const seen = new Set<string>();
  return Array.from(body.querySelectorAll('img'))
    .map((image) => {
      const url = absoluteUrl(
        image.getAttribute('data-original') ||
          image.getAttribute('data-actualsrc') ||
          image.getAttribute('src') ||
          '',
      );
      return { url, alt: image.getAttribute('alt') || '' };
    })
    .filter((media) => {
      if (!media.url || seen.has(media.url)) return false;
      seen.add(media.url);
      return true;
    });
}

function cleanContent(body: Element): string {
  const clone = body.cloneNode(true) as Element;
  clone.querySelectorAll('img, video, button, svg, noscript').forEach((node) => node.remove());
  clone.querySelectorAll('[style], [class], [id]').forEach((node) => {
    node.removeAttribute('style');
    node.removeAttribute('class');
    node.removeAttribute('id');
  });
  return DOMPurify.sanitize(clone.innerHTML, {
    ALLOWED_TAGS: ['p', 'br', 'h2', 'h3', 'h4', 'strong', 'b', 'em', 'i', 'u', 's', 'blockquote', 'ol', 'ul', 'li', 'a', 'code', 'pre'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  });
}

export function parseZhihuBlocks(body: Element): FeedBlock[] {
  const html = cleanContent(body);
  const textContainer = document.createElement('div');
  textContainer.innerHTML = html;
  const contentText = textContainer.textContent?.trim() || '';
  const images = extractMedia(body);
  return [
    ...(contentText ? [{
      type: 'richText' as const,
      html,
      plainText: contentText,
    }] : []),
    ...(images.length ? [{ type: 'gallery' as const, items: images }] : []),
  ];
}

export interface ParsedZhihuContent {
  originId: string;
  originalUrl: string;
  title?: string;
  role: 'answer' | 'article';
  author: FeedAuthor;
  publishedAt?: string | number;
  updatedAt?: string | number;
  blocks: FeedBlock[];
  metrics: FeedMetric[];
  actions: FeedActionDescriptor[];
}

export function parseZhihuContent(element: Element): ParsedZhihuContent | null {
  const body = element.querySelector(BODY_SELECTOR);
  if (!body) return null;

  const metadata = getMetadata(element);
  // 新版回答列表不再把日期写入 data-zop，但仍保留 Schema.org 时间元数据。
  const structuredPublishedAt = firstAttribute(element, [
    'meta[itemprop="dateCreated"]',
    'meta[itemprop="datePublished"]',
  ], 'content');
  const structuredUpdatedAt = firstAttribute(
    element,
    ['meta[itemprop="dateModified"]'],
    'content',
  );
  const title = firstText(element, [
    '.ContentItem-title',
    '.QuestionItem-title',
    'h2',
  ]) || metadata.title || '';
  const originalUrl = getOriginalUrl(element);
  const authorName = firstText(element, [
    '.AuthorInfo-name',
    '.UserLink-link',
    '[itemprop="name"]',
  ]) || metadata.authorName || '';
  const avatar = absoluteUrl(
    firstAttribute(element, ['.Avatar', '.AuthorInfo-avatar img'], 'src'),
  );
  const blocks = parseZhihuBlocks(body);
  // 折叠信息流的封面是正文容器的兄弟节点，需要单独并入图库且避免与正文图片重复。
  const cover = element.querySelector('.RichContent-cover, .RichContent-cover-inner');
  const coverImages = cover ? extractMedia(cover) : [];
  if (coverImages.length) {
    const gallery = blocks.find((block) => block.type === 'gallery');
    if (gallery) {
      const knownUrls = new Set(gallery.items.map((image) => image.url));
      gallery.items.push(...coverImages.filter((image) => !knownUrls.has(image.url)));
    } else {
      blocks.push({ type: 'gallery', items: coverImages });
    }
  }
  const contentText = blocks.find((block) => block.type === 'richText')?.plainText || '';
  if (!title && !contentText) return null;

  const originId =
    element.getAttribute('data-id') ||
    metadata.itemId ||
    originalUrl.match(/\/answer\/(\d+)/)?.[1] ||
    originalUrl.match(/\/p\/(\d+)/)?.[1] ||
    originalUrl.match(/\/question\/(\d+)/)?.[1] ||
    stableHash(`${originalUrl}|${title}|${authorName}|${contentText.slice(0, 120)}`);
  const agrees = parseCount(actionControlText(element, 'react'));
  const downvotes = parseCount(actionControlText(element, 'downvote'));
  const comments = parseCount(actionControlText(element, 'reply'));
  const bookmarks = parseCount(actionControlText(element, 'bookmark'));
  const likes = parseCount(actionControlText(element, 'like'));
  const role = metadata.type === 'article' ||
    element.matches('.ArticleItem, .Post-content, .Post-Main') ||
    /\/p\/\d+/.test(originalUrl)
    ? 'article'
    : 'answer';
  const actions: FeedActionDescriptor[] = [
    {
      id: 'react',
      kind: 'react',
      variant: 'agree',
      label: '赞同',
      count: agrees,
      enabled: true,
      fallback: 'openOriginal',
    },
  ];
  // 知乎没有提供踩数或数量为 0 时，不在统一列表中展示无信息量的入口。
  if (downvotes > 0) {
    actions.push({
      id: 'downvote',
      kind: 'react',
      variant: 'downvote',
      label: '踩',
      count: downvotes,
      enabled: true,
      fallback: 'openOriginal',
    });
  }
  actions.push(
    {
      id: 'reply',
      kind: 'reply',
      label: '评论',
      count: comments,
      enabled: true,
      fallback: 'openOriginal',
    },
    {
      id: 'bookmark',
      kind: 'bookmark',
      label: '收藏',
      count: bookmarks,
      enabled: true,
      fallback: 'openOriginal',
    },
    {
      id: 'like',
      kind: 'react',
      variant: 'like',
      label: '喜欢',
      count: likes,
      enabled: true,
      fallback: 'openOriginal',
    },
    { id: 'open', kind: 'open', label: '查看原文', enabled: true },
  );

  return {
    originId,
    originalUrl,
    title: title || undefined,
    role,
    author: {
      name: authorName || '知乎用户',
      avatar,
      link: absoluteUrl(firstAttribute(element, ['.AuthorInfo-name a', '.UserLink-link'], 'href')) || undefined,
    },
    publishedAt: metadata.dateCreated ??
      metadata.datePublished ??
      (structuredPublishedAt || undefined),
    updatedAt: metadata.dateModified ?? (structuredUpdatedAt || undefined),
    blocks,
    metrics: [
      { kind: 'reactions', value: agrees, label: '赞同' },
      { kind: 'replies', value: comments, label: '评论' },
    ],
    actions,
  };
}

export function parseZhihuCard(element: Element): FeedItem | null {
  // 热榜条目没有回答流的 RichContent 与作者字段，需要按问题摘要单独归一化。
  if (element.matches('.HotItem')) {
    const titleLink = element.querySelector<HTMLAnchorElement>(
      '.HotItem-content > a[href], a[href*="/question/"]',
    );
    const title = firstText(element, ['.HotItem-title']);
    if (!titleLink || !title) return null;

    const originalUrl = absoluteUrl(titleLink.getAttribute('href') || '');
    const originId = originalUrl.match(/\/question\/(\d+)/)?.[1] ||
      stableHash(`${originalUrl}|${title}`);
    const excerpt = element.querySelector('.HotItem-excerpt');
    const previewBlocks = excerpt ? parseZhihuBlocks(excerpt) : [];
    const images = extractMedia(element);
    if (images.length) previewBlocks.push({ type: 'gallery', items: images });

    return {
      id: `zhihu_question_${originId}`,
      platform: 'zhihu',
      source: ZHIHU_SOURCE,
      originalUrl: originalUrl || window.location.href,
      kind: 'discussion',
      role: 'question',
      title,
      author: { name: '知乎用户', avatar: '' },
      sequence: parseCount(firstText(element, ['.HotItem-index'])) || undefined,
      context: { reason: { type: 'recommended', label: '热榜' } },
      previewBlocks,
      metrics: [{
        kind: 'score',
        value: parseCount(firstText(element, ['.HotItem-metrics'])),
        label: '热度',
      }],
      actions: [{ id: 'open', kind: 'open', label: '查看原文', enabled: true }],
    };
  }

  const content = parseZhihuContent(element);
  if (!content) return null;

  return {
    id: `zhihu_${content.originId}`,
    platform: 'zhihu',
    source: ZHIHU_SOURCE,
    originalUrl: content.originalUrl,
    kind: 'article',
    role: content.role,
    title: content.title,
    author: content.author,
    publishedAt: content.publishedAt,
    updatedAt: content.updatedAt,
    previewBlocks: content.blocks,
    metrics: content.metrics,
    actions: content.actions,
  };
}

export function triggerZhihuAction(element: Element | undefined, actionId: string): boolean {
  if (!element || !Object.hasOwn(ACTION_SELECTORS, actionId)) return false;
  const button = findActionControl(element, actionId as ZhihuActionId);
  if (!button) return false;
  button.click();
  return true;
}

export class ZhihuAdapter extends BaseAdapter {
  protected readonly cardSelector = CARD_SELECTOR;

  protected override getFeedChannelBindings(root: ParentNode): RuntimeFeedChannelBinding[] {
    return collectFeedChannelBindings(
      root,
      [
        // 新版页眉的子级 class 是构建哈希，只依赖稳定的 AppHeader 与链接结构。
        'header.AppHeader nav > a[href]',
        '.TopstoryTabs-link',
        '.TopstoryTabs a',
        '.TopstoryTabs button',
        '[class*="TopstoryTabs"] [role="tab"]',
      ].join(', '),
      new URL(window.location.href),
    ).filter(({ channel }) => {
      try {
        return FEED_CHANNEL_PATHS.has(new URL(channel.id, window.location.href).pathname);
      } catch {
        return false;
      }
    });
  }

  parseCard(element: Element): FeedItem | null {
    return parseZhihuCard(element);
  }

  triggerAction(itemId: string, actionId: string): boolean {
    return triggerZhihuAction(this.getRuntimeElement(itemId), actionId);
  }
}

export const zhihuAdapterDefinition: AdapterDefinition = {
  source: ZHIHU_SOURCE,
  matches: (url) => [
    'zhihu.com',
    'www.zhihu.com',
  ].includes(url.hostname) && ['/', '/follow', '/hot', '/recommend'].includes(url.pathname),
  create: (onItems) => new ZhihuAdapter(onItems),
};
