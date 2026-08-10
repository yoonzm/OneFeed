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
  body: FeedBlock[];
  metrics: FeedMetric[];
  actions: FeedActionDescriptor[];
  flags?: FeedFlags;
}

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

export interface ThreadPagination {
  currentPage: number;
  totalPages: number;
  previousUrl?: string;
  nextUrl?: string;
}

export interface ThreadDetail {
  id: string;
  platform: string;
  source: FeedSourceRef;
  originalUrl: string;
  kind: 'thread';
  header: ThreadHeader;
  entries: FeedItem[];
  entryLabel: '回答' | '回复';
  loadingMode: 'infinite' | 'paged';
  pagination?: ThreadPagination;
}

export type DetailContent = ArticleDetail | ThreadDetail;
