/**
 * Adapter 与 Renderer 之间共享的可序列化 Feed 协议。
 * 这里不能保存原站 DOM 节点或点击句柄；这类运行时对象由 Adapter 自己维护。
 */

/** 内容作者快照；avatar 允许为空字符串，Renderer 负责展示降级状态。 */
export interface FeedAuthor {
  name: string;
  avatar: string;
  link?: string;
}

/** 归一化图片信息；尺寸字段用于未来在资源加载前预留稳定空间。 */
export interface FeedImage {
  url: string;
  alt: string;
  width?: number;
  height?: number;
  aspectRatio?: number;
}

/** 视频 Block 的最小跨平台描述，不承诺保留原站播放器的全部能力。 */
export interface FeedVideo {
  poster: string;
  alt?: string;
  url?: string;
  durationSeconds?: number;
  aspectRatio?: number;
  captionsAvailable?: boolean;
}

/** 外链卡片使用的站点无关摘要。 */
export interface FeedLinkPreview {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
}

/** 引用 Block 只携带渲染引用内容所需的轻量字段，避免递归嵌套 FeedItem。 */
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

/**
 * Renderer 支持的标准内容积木。
 * richText.html 必须由 Adapter 在写入协议前完成清洗；plainText 专供长度判断、
 * 去重或摘要使用，避免 Renderer 再次解析 HTML。
 */
export type FeedBlock =
  | { type: 'richText'; html: string; plainText: string }
  | { type: 'gallery'; items: FeedImage[] }
  | { type: 'video'; media: FeedVideo }
  | { type: 'linkPreview'; preview: FeedLinkPreview }
  | { type: 'quote'; item: FeedItemSummary }
  | { type: 'poll'; poll: FeedPoll };

/** 内容本身的结构形态，不表示它在当前页面中的位置。 */
export type ContentKind = 'post' | 'article' | 'discussion';

/**
 * 内容在 Surface 中承担的语义角色。
 * 例如知乎回答的 kind 是 article，但在问题 Thread 中的 role 是 answer。
 */
export type ContentRole =
  | 'post'
  | 'article'
  | 'question'
  | 'topic'
  | 'answer'
  | 'reply';

/** 内容为何出现、属于哪个社区以及携带哪些标签。 */
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

/** 只读统计值；是否同时显示由 Renderer 根据操作类型去重决定。 */
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

/**
 * Adapter 暴露给 Renderer 的操作能力描述。
 * id 用于回传给原站动作 Registry，kind 用于通用渲染，二者不可互相替代。
 */
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

/** FeedItem 内只保存轻量来源引用，避免每条内容重复 homeUrl。 */
export interface FeedSourceRef {
  id: string;
  name: string;
}

/** Surface 级来源信息；homeUrl 可用于需要站点首页入口的外壳组件。 */
export interface FeedSource extends FeedSourceRef {
  homeUrl: string;
}

/** Feed Surface 请求下一批内容后的结果；Renderer 只消费状态，不感知站点加载机制。 */
export type FeedLoadResult =
  | { kind: 'loaded'; added: number; hasMore: boolean }
  | { kind: 'exhausted' }
  | { kind: 'failed'; retryable: boolean };

/**
 * Feed Surface 与 Thread 条目共用的标准卡片模型。
 * 字段保持可序列化，使状态库、测试夹具和未来的持久化层无需理解原站 DOM。
 */
export interface FeedItem {
  /** 在当前 Adapter 生命周期内稳定，用于去重、更新和动作路由。 */
  id: string;
  /** Adapter 的平台标识，不用于决定主题样式。 */
  platform: string;
  source: FeedSourceRef;
  originalUrl: string;
  kind: ContentKind;
  role: ContentRole;
  /** 作者数据仍属于协议，即使某个主题选择不在列表 Card 中展示。 */
  author: FeedAuthor;
  sequence?: number;
  context?: FeedContext;
  publishedAt?: string | number;
  updatedAt?: string | number;
  title?: string;
  /** 按原内容顺序排列；Renderer 不应在这里加入平台分支。 */
  previewBlocks: FeedBlock[];
  metrics: FeedMetric[];
  actions: FeedActionDescriptor[];
  flags?: FeedFlags;
}
