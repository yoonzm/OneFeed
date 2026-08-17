import type {
  FeedActionDescriptor,
  FeedAuthor,
  FeedBlock,
  FeedContext,
  FeedFlags,
  FeedItem,
  FeedMetric,
  FeedSourceRef,
} from './feed';

/** 单篇正文所属的上级内容摘要，例如回答对应的问题背景。 */
export interface ArticleContext {
  body: FeedBlock[];
}

/**
 * 单篇正文 Surface，例如知乎回答详情或专栏文章。
 * 它与 FeedItem 分开建模，确保详情正文不会被列表预览截断规则影响。
 */
export interface ArticleDetail {
  id: string;
  platform: string;
  source: FeedSourceRef;
  originalUrl: string;
  kind: 'article';
  role: 'article' | 'answer';
  author: FeedAuthor;
  publishedAt?: string | number;
  updatedAt?: string | number;
  title?: string;
  context?: ArticleContext;
  body: FeedBlock[];
  metrics: FeedMetric[];
  actions: FeedActionDescriptor[];
  flags?: FeedFlags;
}

/**
 * Thread 顶部的主题实体，例如问题或社区 Topic。
 * header 不是一条普通回复，因此不强行复用 FeedItem。
 */
export interface ThreadHeader {
  id: string;
  role: 'question' | 'topic';
  originalUrl: string;
  title: string;
  author?: FeedAuthor;
  publishedAt?: string | number;
  body: FeedBlock[];
  context?: FeedContext;
  metrics: FeedMetric[];
  actions: FeedActionDescriptor[];
  flags?: FeedFlags;
}

/** 原站显式分页信息；无限加载模式不会依赖该结构。 */
export interface ThreadPagination {
  currentPage: number;
  totalPages: number;
  previousUrl?: string;
  nextUrl?: string;
}

/**
 * 讨论型详情 Surface：固定 header 加一组可独立更新和折叠的 FeedItem 条目。
 */
export interface ThreadDetail {
  id: string;
  platform: string;
  source: FeedSourceRef;
  originalUrl: string;
  kind: 'thread';
  header: ThreadHeader;
  entries: FeedItem[];
  /** 面向用户的集合名称，同时用于标题和无内容状态。 */
  entryLabel: '回答' | '回复';
  /** 决定触底同步原页面，还是渲染上一页/下一页链接。 */
  loadingMode: 'infinite' | 'paged';
  pagination?: ThreadPagination;
}

/** DetailApp 使用 kind 判别的联合类型。 */
export type DetailContent = ArticleDetail | ThreadDetail;
