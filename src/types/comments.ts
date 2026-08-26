import type { FeedAuthor, FeedBlock, FeedMetric } from './feed';

/** 详情内容可提供的按需评论能力；真实 DOM 控件仍由 Adapter 持有。 */
export interface CommentThreadDescriptor {
  targetId: string;
  count: number;
  capabilities: {
    preview: boolean;
    all: boolean;
    loadMore: boolean;
    replies: boolean;
  };
}

/** Renderer 可跨平台展示的单条评论快照。 */
export interface CommentItem {
  id: string;
  parentId?: string;
  author: FeedAuthor;
  body: FeedBlock[];
  publishedAt?: string | number;
  metadataLabels?: string[];
  metrics: FeedMetric[];
  replyCount?: number;
}

/** 一次 Adapter 请求返回的评论集合；局部区和完整弹层必须分开解析。 */
export interface CommentSnapshot {
  targetId: string;
  scope: 'preview' | 'all' | 'replies';
  /** 回复快照所属的父评论；其他 scope 不提供。 */
  rootId?: string;
  total: number;
  items: CommentItem[];
  hasMore: boolean;
}

export type CommentCommand =
  | { kind: 'openPreview'; targetId: string }
  | { kind: 'openAll'; targetId: string }
  | { kind: 'loadMore'; targetId: string }
  | { kind: 'openReplies'; targetId: string; commentId: string }
  | { kind: 'closeReplies'; targetId: string }
  | { kind: 'closeAll'; targetId: string };

export type CommentRequestResult =
  | { kind: 'loaded'; snapshot: CommentSnapshot }
  | { kind: 'exhausted'; snapshot: CommentSnapshot }
  | { kind: 'closed' }
  | { kind: 'failed'; retryable: boolean };
