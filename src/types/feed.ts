export interface FeedAuthor {
  name: string;
  avatar: string;
  link?: string;
}

export interface FeedImage {
  url: string;
  alt: string;
  width?: number;
  height?: number;
  aspectRatio?: number;
}

export interface FeedVideo {
  poster: string;
  alt?: string;
  url?: string;
  durationSeconds?: number;
  aspectRatio?: number;
  captionsAvailable?: boolean;
}

export interface FeedLinkPreview {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
}

export interface FeedItemSummary {
  id: string;
  originalUrl: string;
  author: FeedAuthor;
  title?: string;
  text?: string;
}

export interface FeedPollOption {
  id: string;
  label: string;
  votes?: number;
}

export interface FeedPoll {
  question?: string;
  options: FeedPollOption[];
  totalVotes?: number;
  endsAt?: string | number;
  selectedOptionId?: string;
}

export type FeedBlock =
  | { type: 'richText'; html: string; plainText: string }
  | { type: 'gallery'; items: FeedImage[] }
  | { type: 'video'; media: FeedVideo }
  | { type: 'linkPreview'; preview: FeedLinkPreview }
  | { type: 'quote'; item: FeedItemSummary }
  | { type: 'poll'; poll: FeedPoll };

export type ContentKind = 'post' | 'article' | 'discussion';

export type ContentRole =
  | 'post'
  | 'article'
  | 'question'
  | 'topic'
  | 'answer'
  | 'reply';

export interface FeedContext {
  community?: {
    id?: string;
    name: string;
    url?: string;
  };
  reason?: {
    type: 'repost' | 'recommended' | 'followedTopic' | 'pinned';
    label: string;
    actor?: FeedAuthor;
  };
  tags?: Array<{
    id?: string;
    name: string;
    url?: string;
  }>;
}

export type FeedMetricKind =
  | 'reactions'
  | 'replies'
  | 'reposts'
  | 'views'
  | 'score';

export interface FeedMetric {
  kind: FeedMetricKind;
  value: number;
  label?: string;
}

export type FeedActionKind =
  | 'react'
  | 'reply'
  | 'repost'
  | 'bookmark'
  | 'share'
  | 'open';

export interface FeedActionDescriptor {
  id: string;
  kind: FeedActionKind;
  variant?: 'like' | 'agree' | 'upvote' | 'downvote';
  label: string;
  count?: number;
  active?: boolean;
  enabled: boolean;
  fallback?: 'openOriginal';
}

export interface FeedFlags {
  sensitive?: boolean;
  spoiler?: boolean;
  locked?: boolean;
  pinned?: boolean;
}

export interface FeedSourceRef {
  id: string;
  name: string;
}

export interface FeedSource extends FeedSourceRef {
  homeUrl: string;
}

export interface FeedItem {
  id: string;
  platform: string;
  source: FeedSourceRef;
  originalUrl: string;
  kind: ContentKind;
  role: ContentRole;
  author: FeedAuthor;
  sequence?: number;
  context?: FeedContext;
  publishedAt?: string | number;
  updatedAt?: string | number;
  title?: string;
  previewBlocks: FeedBlock[];
  metrics: FeedMetric[];
  actions: FeedActionDescriptor[];
  flags?: FeedFlags;
}
