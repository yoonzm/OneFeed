import type {
  FeedActionDescriptor,
  FeedAuthor,
  FeedBlock,
  FeedFlags,
  FeedMetric,
  FeedSourceRef,
} from './feed';

export interface ArticleDetail {
  id: string;
  platform: string;
  source: FeedSourceRef;
  originalUrl: string;
  kind: 'article';
  author: FeedAuthor;
  publishedAt?: string | number;
  updatedAt?: string | number;
  title?: string;
  body: FeedBlock[];
  metrics: FeedMetric[];
  actions: FeedActionDescriptor[];
  flags?: FeedFlags;
}

export type DetailContent = ArticleDetail;
