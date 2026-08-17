import type { ArticleDetail } from '../../types/detail';
import type { DetailAdapterDefinition, DetailListener } from './detail';
import {
  parseZhihuBlocks,
  parseZhihuContent,
  triggerZhihuAction,
  ZHIHU_SOURCE,
} from './zhihu';

const ANSWER_SELECTOR = '.ContentItem.AnswerItem, .AnswerItem';
const ARTICLE_SELECTOR = '.Post-content, .Post-Main';

interface ZhihuDetailMetadata {
  itemId?: string | number;
  type?: string;
  dateCreated?: string | number;
  datePublished?: string | number;
  dateModified?: string | number;
  upvoteCount?: number;
  commentCount?: number;
}

function readMetadata(element: Element): ZhihuDetailMetadata {
  const value = element.getAttribute('data-zop') ||
    element.querySelector('[data-zop]')?.getAttribute('data-zop');
  if (!value) return {};

  try {
    return JSON.parse(value) as ZhihuDetailMetadata;
  } catch {
    return {};
  }
}

export function isZhihuDetailUrl(url: URL): boolean {
  const isMainHost = ['zhihu.com', 'www.zhihu.com'].includes(url.hostname);
  const isArticleHost = isMainHost || url.hostname === 'zhuanlan.zhihu.com';
  return (isMainHost && /^\/question\/\d+\/answer\/\d+\/?$/.test(url.pathname)) ||
    (isArticleHost && /^\/p\/\d+\/?$/.test(url.pathname));
}

export function findZhihuDetailRoot(root: ParentNode, url: URL): Element | null {
  const answerId = url.pathname.match(/^\/question\/\d+\/answer\/(\d+)/)?.[1];
  if (answerId) {
    const answers = Array.from(root.querySelectorAll(ANSWER_SELECTOR));
    return answers.find((element) => {
      const metadata = readMetadata(element);
      return String(metadata.itemId ?? '') === answerId &&
        (!metadata.type || metadata.type === 'answer');
    }) || null;
  }

  const articleId = url.pathname.match(/^\/p\/(\d+)/)?.[1];
  if (!articleId) return null;
  const articles = Array.from(root.querySelectorAll(ARTICLE_SELECTOR));
  return articles.find((element) => {
    const metadata = readMetadata(element);
    return String(metadata.itemId ?? '') === articleId &&
      (!metadata.type || metadata.type === 'article');
  }) || null;
}

function pageTitle(root: ParentNode): string {
  for (const selector of ['.QuestionHeader-title', '.Post-Title', 'h1']) {
    const title = root.querySelector(selector)?.textContent?.trim();
    if (title) return title;
  }
  return '';
}

function metricValue(value: number | undefined, fallback: number): number {
  return Number.isFinite(value) ? value! : fallback;
}

function questionNavigation(
  root: ParentNode,
  url: URL,
  questionId: string,
): NonNullable<ArticleDetail['context']>['navigation'] {
  const questionPath = `/question/${questionId}`;
  const originalLink = Array.from(root.querySelectorAll<HTMLAnchorElement>('a[href]'))
    .find((link) => {
      const label = link.textContent?.replace(/\s+/g, ' ').trim() || '';
      if (!/^查看全部.*回答$/.test(label)) return false;

      try {
        // 仅采纳当前问题的入口，避免误用页面中其他问题或回答链接。
        return new URL(link.getAttribute('href') || '', url.href).pathname.replace(/\/$/, '') ===
          questionPath;
      } catch {
        return false;
      }
    });

  return {
    label: originalLink?.textContent?.replace(/\s+/g, ' ').trim() || '查看全部回答',
    url: new URL(questionPath, url.origin).href,
  };
}

function questionContext(root: ParentNode, url: URL): ArticleDetail['context'] {
  const questionId = url.pathname.match(/^\/question\/(\d+)\/answer\/\d+/)?.[1];
  if (!questionId) return undefined;

  const element = root.querySelector([
    '.QuestionHeader-detail .RichContent-inner',
    '.QuestionHeader-detail .RichText',
    '.QuestionRichText .RichContent-inner',
    '.QuestionRichText .RichText',
    '.QuestionRichText',
  ].join(', '));

  return {
    body: element ? parseZhihuBlocks(element) : [],
    navigation: questionNavigation(root, url, questionId),
  };
}

export function parseZhihuDetail(
  element: Element,
  url = new URL(window.location.href),
  root: ParentNode = document,
): ArticleDetail | null {
  const parsed = parseZhihuContent(element);
  if (!parsed) return null;

  const metadata = readMetadata(element);
  const answerId = url.pathname.match(/^\/question\/\d+\/answer\/(\d+)/)?.[1];
  const articleId = url.pathname.match(/^\/p\/(\d+)/)?.[1];
  const originId = metadata.itemId ?? answerId ?? articleId ?? parsed.originId;
  const reactions = parsed.metrics.find((metric) => metric.kind === 'reactions')?.value || 0;
  const replies = parsed.metrics.find((metric) => metric.kind === 'replies')?.value || 0;

  return {
    id: `zhihu_${originId}`,
    platform: 'zhihu',
    source: ZHIHU_SOURCE,
    originalUrl: url.href,
    kind: 'article',
    role: parsed.role,
    author: parsed.author,
    publishedAt: metadata.dateCreated ?? metadata.datePublished,
    updatedAt: metadata.dateModified,
    title: pageTitle(root) || parsed.title,
    context: questionContext(root, url),
    body: parsed.blocks,
    metrics: [
      {
        kind: 'reactions',
        value: metricValue(metadata.upvoteCount, reactions),
        label: '赞同',
      },
      {
        kind: 'replies',
        value: metricValue(metadata.commentCount, replies),
        label: '评论',
      },
    ],
    actions: parsed.actions
      .filter((action) => action.kind !== 'open')
      .map((action) => ({
        ...action,
        enabled: action.kind === 'reply' ? false : action.enabled,
        fallback: undefined,
      })),
  };
}

export class ZhihuDetailAdapter {
  private observer?: MutationObserver;
  private timer?: number;
  private runtimeElement?: Element;
  private itemId?: string;

  constructor(private readonly onDetail: DetailListener) {}

  init(): void {
    this.processDetail();
    this.observer = new MutationObserver(() => {
      window.clearTimeout(this.timer);
      this.timer = window.setTimeout(() => this.processDetail(), 120);
    });
    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
    });
  }

  disconnect(): void {
    this.observer?.disconnect();
    window.clearTimeout(this.timer);
    this.runtimeElement = undefined;
    this.itemId = undefined;
  }

  triggerAction(itemId: string, actionId: string): boolean {
    if (itemId !== this.itemId) return false;
    return triggerZhihuAction(this.runtimeElement, actionId);
  }

  private processDetail(): void {
    const url = new URL(window.location.href);
    const element = findZhihuDetailRoot(document, url);
    if (!element) return;
    const content = parseZhihuDetail(element, url);
    if (!content) return;
    this.runtimeElement = element;
    this.itemId = content.id;
    this.onDetail(content);
  }
}

export const zhihuDetailAdapterDefinition: DetailAdapterDefinition = {
  source: ZHIHU_SOURCE,
  surface: 'article',
  matches: isZhihuDetailUrl,
  create: (onDetail) => new ZhihuDetailAdapter(onDetail),
};
