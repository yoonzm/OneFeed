/**
 * Adapter 与 Renderer 之间共享的可序列化 Feed 协议。
 * 这里不能保存原站 DOM 节点或点击句柄；这类运行时对象由 Adapter 自己维护。
 */

/** 内容作者快照；原内容没有作者时 name 为空，Renderer 不展示作者信息。 */
export interface FeedAuthor {
  /** 面向用户展示的作者名称；空字符串表示原内容没有可展示的作者。 */
  name: string;
  /** 作者头像的绝对 URL；空字符串表示原站未提供可用头像。 */
  avatar: string;
  /** 作者主页的绝对 URL；缺失时作者名称只作为文本展示。 */
  link?: string;
}

/** 归一化图片信息；尺寸字段用于未来在资源加载前预留稳定空间。 */
export interface FeedImage {
  /** 可直接加载的图片绝对 URL。 */
  url: string;
  /** 图片替代文本；原站未提供时允许为空字符串。 */
  alt: string;
  /** 图片固有宽度，单位为 CSS 像素。 */
  width?: number;
  /** 图片固有高度，单位为 CSS 像素。 */
  height?: number;
  /** 宽高比 width / height；可在固有尺寸不可用时辅助布局。 */
  aspectRatio?: number;
}

/** 视频 Block 的最小跨平台描述，不承诺保留原站播放器的全部能力。 */
export interface FeedVideo {
  /** 视频封面图的绝对 URL。 */
  poster: string;
  /** 视频画面的无障碍替代描述。 */
  alt?: string;
  /** 可直接打开或播放的视频 URL；缺失时仅展示封面。 */
  url?: string;
  /** 视频总时长，单位为秒。 */
  durationSeconds?: number;
  /** 视频画面的宽高比，用于提前确定媒体区域尺寸。 */
  aspectRatio?: number;
  /** 原内容是否提供字幕，不表示 Renderer 已实现字幕播放。 */
  captionsAvailable?: boolean;
}

/** 外链卡片使用的站点无关摘要。 */
export interface FeedLinkPreview {
  /** 外链最终指向的绝对 URL。 */
  url: string;
  /** 外链页面标题。 */
  title?: string;
  /** 外链页面的摘要文本。 */
  description?: string;
  /** 外链预览图的绝对 URL。 */
  image?: string;
  /** 外链所属站点的展示名称。 */
  siteName?: string;
}

/** 引用 Block 只携带渲染所需的轻量内容摘要，避免递归嵌套完整条目。 */
export interface FeedItemSummary {
  /** 被引用内容在对应 Adapter 生命周期内的稳定标识。 */
  id: string;
  /** 被引用内容的原文绝对 URL。 */
  originalUrl: string;
  /** 被引用内容的作者快照。 */
  author: FeedAuthor;
  /** 被引用内容的标题。 */
  title?: string;
  /** 被引用内容的纯文本摘要。 */
  text?: string;
}

/** 投票中的单个可选项及其可见统计。 */
export interface FeedPollOption {
  /** 选项在当前投票中的稳定标识。 */
  id: string;
  /** 面向用户展示的选项文本。 */
  label: string;
  /** 原站公开的当前票数；缺失表示无法可靠解析。 */
  votes?: number;
}

/** 跨平台投票内容；只描述可展示状态，不承诺支持提交投票。 */
export interface FeedPoll {
  /** 投票问题；缺失时由所在内容的正文提供上下文。 */
  question?: string;
  /** 按原站顺序排列的投票选项。 */
  options: FeedPollOption[];
  /** 原站公开的总票数。 */
  totalVotes?: number;
  /** 投票结束时间，保留原站可解析的时间表示。 */
  endsAt?: string | number;
  /** 当前用户已选择的选项 ID；缺失表示未选择或状态不可得。 */
  selectedOptionId?: string;
}

/**
 * Renderer 支持的标准内容积木。
 * richText.html 必须由 Adapter 在写入协议前完成清洗；平台内联表情统一使用
 * `img[data-onefeed-kind="emoji"]` 标记。plainText 专供长度判断、过滤、去重或摘要使用，
 * 避免 Renderer 再次解析 HTML。
 */
export type FeedBlock =
  /** 已清洗的富文本内容。 */
  | {
    /** Block 判别字段。 */
    type: 'richText';
    /** 由 Adapter 清洗后的安全 HTML。 */
    html: string;
    /** 与 HTML 对应的纯文本，用于判断长度、过滤、去重和摘要。 */
    plainText: string;
  }
  /** 按原内容顺序展示的一组图片。 */
  | {
    /** Block 判别字段。 */
    type: 'gallery';
    /** 已归一化且完成去重的图片列表。 */
    items: FeedImage[];
  }
  /** 单个视频及其基础元数据。 */
  | {
    /** Block 判别字段。 */
    type: 'video';
    /** 视频的跨平台描述。 */
    media: FeedVideo;
  }
  /** 指向站外或站内其他页面的链接摘要。 */
  | {
    /** Block 判别字段。 */
    type: 'linkPreview';
    /** 外链的跨平台预览数据。 */
    preview: FeedLinkPreview;
  }
  /** 对另一条内容的轻量引用。 */
  | {
    /** Block 判别字段。 */
    type: 'quote';
    /** 被引用内容的非递归摘要。 */
    item: FeedItemSummary;
  }
  /** 内容中包含的投票。 */
  | {
    /** Block 判别字段。 */
    type: 'poll';
    /** 投票选项和当前可见状态。 */
    poll: FeedPoll;
  };

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
  /** 内容所属的社区、板块或频道。 */
  community?: {
    /** 社区在原平台中的稳定标识。 */
    id?: string;
    /** 社区的展示名称。 */
    name: string;
    /** 社区页面的绝对 URL。 */
    url?: string;
  };
  /** 内容进入当前信息流的可解释原因。 */
  reason?: {
    /** 推荐原因的标准类别。 */
    type: 'repost' | 'recommended' | 'followedTopic' | 'pinned';
    /** 面向用户展示的原站原因文案。 */
    label: string;
    /** 触发转发等原因的相关用户。 */
    actor?: FeedAuthor;
  };
  /** 与内容关联的标签，保持原站顺序。 */
  tags?: Array<{
    /** 标签在原平台中的稳定标识。 */
    id?: string;
    /** 标签的展示名称，不包含 Renderer 添加的前缀。 */
    name: string;
    /** 标签聚合页的绝对 URL。 */
    url?: string;
  }>;
}

/** Renderer 能够统一展示的只读统计类别。 */
export type FeedMetricKind =
  | 'reactions'
  | 'replies'
  | 'reposts'
  | 'views'
  | 'score';

/** 只读统计值；是否同时显示由 Renderer 根据操作类型去重决定。 */
export interface FeedMetric {
  /** 统计值的标准类别。 */
  kind: FeedMetricKind;
  /** 已解析并归一化为数字的统计值。 */
  value: number;
  /** 平台提供的本地化名称；缺失时 Renderer 使用标准类别降级。 */
  label?: string;
}

/** Renderer 能够统一表达并交还 Adapter 执行的操作类别。 */
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
  /** Adapter 动作 Registry 使用的稳定标识，不要求跨平台统一。 */
  id: string;
  /** Renderer 用于选择通用交互形式的标准操作类别。 */
  kind: FeedActionKind;
  /** 同一操作类别下的平台语义变体。 */
  variant?: 'like' | 'agree' | 'upvote' | 'downvote';
  /** 面向用户展示的操作名称。 */
  label: string;
  /** 与操作绑定的当前统计值，例如点赞数。 */
  count?: number;
  /** 当前用户是否已激活该操作。 */
  active?: boolean;
  /** 当前页面是否存在可由 Adapter 代理的原站控件。 */
  enabled: boolean;
  /** Adapter 无法执行动作时允许 Renderer 采用的显式回退策略。 */
  fallback?: 'openOriginal';
}

/** 原内容携带的跨平台状态标记。 */
export interface FeedFlags {
  /** 内容是否被原平台标记为敏感。 */
  sensitive?: boolean;
  /** 内容是否包含需要主动展开的剧透。 */
  spoiler?: boolean;
  /** 所属讨论是否已锁定互动。 */
  locked?: boolean;
  /** 内容是否被固定在列表或讨论顶部。 */
  pinned?: boolean;
}

/** 内容条目内只保存轻量来源引用，避免每条内容重复 homeUrl。 */
export interface FeedSourceRef {
  /** Adapter 注册和跨模块匹配使用的平台标识。 */
  id: string;
  /** 面向用户展示的平台名称。 */
  name: string;
}

/** Surface 级来源信息；homeUrl 可用于需要站点首页入口的外壳组件。 */
export interface FeedSource extends FeedSourceRef {
  /** 平台首页或当前 Feed 根页面的绝对 URL。 */
  homeUrl: string;
}

/** 从当前原站 DOM 动态发现的信息流频道；点击能力由 Adapter 在运行时代理。 */
export interface FeedChannel {
  /** Adapter 在当前页面内用于路由点击的稳定频道标识。 */
  id: string;
  /** 原站提供的频道展示名称。 */
  label: string;
  /** 频道是否对应原页面当前选中状态。 */
  active: boolean;
}

/** Feed Surface 请求下一批内容后的结果；Renderer 只消费状态，不感知站点加载机制。 */
export type FeedLoadResult =
  /** 本次请求完成，并确认新增条目数量和后续加载能力。 */
  | {
    /** 加载结果判别字段。 */
    kind: 'loaded';
    /** 去重后实际加入 Store 的条目数量。 */
    added: number;
    /** 原页面是否仍可能提供下一批内容。 */
    hasMore: boolean;
  }
  /** Adapter 已确认当前 Feed 没有更多内容。 */
  | {
    /** 加载结果判别字段。 */
    kind: 'exhausted';
  }
  /** 本次加载未完成。 */
  | {
    /** 加载结果判别字段。 */
    kind: 'failed';
    /** 用户再次触发加载是否可能成功。 */
    retryable: boolean;
  };

/**
 * Feed 与 Thread 条目共享的可序列化内容字段。
 * Surface 专属的正文完整性和展示策略由派生模型与 Renderer 负责。
 */
export interface ContentItemBase {
  /** 在当前 Adapter 生命周期内稳定，用于去重、更新和动作路由。 */
  id: string;
  /** Adapter 的平台标识，不用于决定主题样式。 */
  platform: string;
  /** 内容来源的轻量引用。 */
  source: FeedSourceRef;
  /** 打开原内容或执行显式回退时使用的绝对 URL。 */
  originalUrl: string;
  /** 内容本身的结构形态。 */
  kind: ContentKind;
  /** 内容在当前 Surface 中承担的语义角色。 */
  role: ContentRole;
  /** 作者数据仍属于协议；原内容没有作者时保留空作者快照。 */
  author: FeedAuthor;
  /** 原讨论中的楼层或条目序号；缺失时 Renderer 使用当前列表位置。 */
  sequence?: number;
  /** 内容所属社区、出现原因和标签等辅助上下文。 */
  context?: FeedContext;
  /** 原内容首次发布时间，保留 Adapter 可可靠解析的时间表示。 */
  publishedAt?: string | number;
  /** 原内容最近更新时间，缺失表示原站未提供或无法解析。 */
  updatedAt?: string | number;
  /** 内容标题；无标题动态和回复允许缺失。 */
  title?: string;
  /** 与内容关联的只读统计值。 */
  metrics: FeedMetric[];
  /** 当前页面可提供或可回退的用户操作。 */
  actions: FeedActionDescriptor[];
  /** 原平台标记的敏感、剧透、锁定或置顶状态。 */
  flags?: FeedFlags;
}

/** Feed Surface 的列表条目；previewBlocks 只承诺提供列表预览所需内容。 */
export interface FeedItem extends ContentItemBase {
  /** 按原内容顺序排列；Renderer 不应在这里加入平台分支。 */
  previewBlocks: FeedBlock[];
}

/** Thread Detail 中的回答或回复；body 表示当前详情页已解析到的完整条目正文。 */
export interface ThreadEntry extends ContentItemBase {
  /** Thread 条目只能承担回答或回复角色。 */
  role: 'answer' | 'reply';
  /** 按原内容顺序排列的完整回答或回复正文。 */
  body: FeedBlock[];
}
