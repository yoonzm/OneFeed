import type {
  FeedActionDescriptor,
  FeedAuthor,
  FeedBlock,
  FeedContext,
  FeedFlags,
  FeedMetric,
  FeedSourceRef,
  ThreadEntry,
} from './feed';
import type { CommentThreadDescriptor } from './comments';

/** 单篇正文所属的上级内容摘要，例如回答对应的问题背景。 */
export interface ArticleContext {
  /** 上级问题或主题的正文 Block。 */
  body: FeedBlock[];
  /** 返回上级内容时使用的命名导航入口。 */
  navigation?: {
    /** 面向用户展示的导航名称，例如“查看原问题”。 */
    label: string;
    /** 上级内容的绝对 URL。 */
    url: string;
  };
}

/** Article 详情中的命名操作区域；由 Adapter 决定内容，Renderer 只负责落位。 */
export interface ArticleActionSlot {
  /** 当前操作区域需要展示的只读统计值。 */
  metrics: FeedMetric[];
  /** 当前操作区域允许用户触发的操作。 */
  actions: FeedActionDescriptor[];
}

/**
 * 单篇正文 Surface，例如微博动态、知乎回答详情或专栏文章。
 * 它与 FeedItem 分开建模，确保详情正文不会被列表预览截断规则影响。
 */
export interface ArticleDetail {
  /** 详情实体在对应 Adapter 生命周期内的稳定标识。 */
  id: string;
  /** 生成该详情数据的平台 Adapter 标识。 */
  platform: string;
  /** 内容来源的轻量引用。 */
  source: FeedSourceRef;
  /** 当前单篇正文的原文绝对 URL。 */
  originalUrl: string;
  /** DetailApp 用于判别单篇正文 Surface 的固定类型。 */
  kind: 'article';
  /** 正文是短动态、独立文章还是隶属于问题的回答。 */
  role: 'post' | 'article' | 'answer';
  /** 正文作者快照。 */
  author: FeedAuthor;
  /** 原文首次发布时间，保留 Adapter 可可靠解析的时间表示。 */
  publishedAt?: string | number;
  /** 原文最近更新时间。 */
  updatedAt?: string | number;
  /** 与作者或时间相邻展示的原站元信息，例如回答者的 IP 属地。 */
  metadataLabels?: string[];
  /** 正文标题；由上级问题提供标题时也允许存在。 */
  title?: string;
  /** 单篇正文所属问题或主题的辅助内容与导航。 */
  context?: ArticleContext;
  /** 按原文顺序排列且不受 Feed 预览截断影响的完整正文。 */
  body: FeedBlock[];
  /** 按详情布局位置划分的可选操作区域。 */
  actionSlots?: {
    /** 靠近作者信息展示的操作和统计。 */
    author?: ArticleActionSlot;
    /** 正文结束后展示的操作和统计。 */
    footer?: ArticleActionSlot;
  };
  /** 当前正文可由 Detail Adapter 按需读取的评论能力。 */
  comments?: CommentThreadDescriptor;
  /** 原平台标记的敏感、剧透、锁定或置顶状态。 */
  flags?: FeedFlags;
}

/**
 * Thread 顶部的主题实体，例如问题或社区 Topic。
 * header 不是一条普通回复，因此不强行复用 ThreadEntry。
 */
export interface ThreadHeader {
  /** 问题或主题在对应 Adapter 生命周期内的稳定标识。 */
  id: string;
  /** Thread 顶部实体是问题还是社区主题。 */
  role: 'question' | 'topic';
  /** 问题或主题的原文绝对 URL。 */
  originalUrl: string;
  /** Thread 页面主标题。 */
  title: string;
  /** 发起问题或主题的作者；原站不公开时允许缺失。 */
  author?: FeedAuthor;
  /** 问题或主题首次发布时间。 */
  publishedAt?: string | number;
  /** 问题补充或主题首帖的完整正文。 */
  body: FeedBlock[];
  /** 所属社区、标签等 Thread 级辅助上下文。 */
  context?: FeedContext;
  /** 问题或主题整体的只读统计值。 */
  metrics: FeedMetric[];
  /** 针对问题或主题本身的可用操作。 */
  actions: FeedActionDescriptor[];
  /** 原平台标记的敏感、剧透、锁定或置顶状态。 */
  flags?: FeedFlags;
}

/** 原站显式分页信息；无限加载模式不会依赖该结构。 */
export interface ThreadPagination {
  /** 当前正在展示的页码，从 1 开始。 */
  currentPage: number;
  /** 原站声明的总页数。 */
  totalPages: number;
  /** 上一页的绝对 URL；当前为第一页时缺失。 */
  previousUrl?: string;
  /** 下一页的绝对 URL；当前为最后一页时缺失。 */
  nextUrl?: string;
}

/**
 * 讨论型详情 Surface：固定 header 加一组可独立更新的回答或回复条目。
 */
export interface ThreadDetail {
  /** Thread Surface 在对应 Adapter 生命周期内的稳定标识。 */
  id: string;
  /** 生成该详情数据的平台 Adapter 标识。 */
  platform: string;
  /** 内容来源的轻量引用。 */
  source: FeedSourceRef;
  /** 当前问题或主题的原文绝对 URL。 */
  originalUrl: string;
  /** DetailApp 用于判别讨论型 Surface 的固定类型。 */
  kind: 'thread';
  /** 不参与普通条目列表渲染的问题或主题头部。 */
  header: ThreadHeader;
  /** 按原讨论顺序排列的回答或回复。 */
  entries: ThreadEntry[];
  /** 集合的跨平台语义；具体展示名称由 Renderer 按界面语言决定。 */
  entryKind: 'answer' | 'reply';
  /** 决定触底同步原页面，还是渲染上一页/下一页链接。 */
  loadingMode: 'infinite' | 'paged';
  /** paged 模式下的原站分页导航；无限加载模式通常缺失。 */
  pagination?: ThreadPagination;
}

/** DetailApp 使用 kind 判别的联合类型。 */
export type DetailContent = ArticleDetail | ThreadDetail;
