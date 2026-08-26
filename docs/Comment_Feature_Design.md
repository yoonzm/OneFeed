# 文章详情评论功能设计

## 1. 目标

为 `Article Detail` 增加统一的评论阅读能力，首个适配平台为知乎回答详情。用户在 OneFeed 中点击“评论”后直接打开 OneFeed 自己的评论弹窗；弹窗先使用原站首批评论快照，并在后台自动切换到完整评论数据，触底时继续加载原站评论。

Renderer 只理解统一评论协议和统一命令，不读取知乎 DOM，不判断 `platform === 'zhihu'`，也不渲染原站评论节点。知乎的控件查找、弹层识别、滚动加载和字段解析全部留在 Adapter。

### 首期范围

- 支持知乎回答详情的评论总数和统一评论弹窗，不在文章底部插入评论区。
- 支持全部评论弹窗内的增量加载、按评论 ID 去重和失败重试。
- 展示作者、头像、正文、原站可可靠提取的时间/位置标签、点赞数和回复数。
- 保留当前评论入口的原文回退能力。

### 首期不做

- 发表评论、回复评论、点赞评论和删除评论。
- 切换“默认 / 最新”等排序。
- 主动展开每条评论下尚未加载的全部子回复。
- 把评论强行建模为新的 `ThreadDetail`。文章评论仍是文章的从属集合，不是独立详情 Surface。
- 直接调用知乎未公开的评论 API。

## 2. 现状与约束

当前详情链路具有以下边界：

- `ArticleDetail` 是一次性、可序列化的正文快照；`useDetailStore` 每次直接替换该快照。
- `DetailAdapter.triggerAction(itemId, actionId)` 只负责把操作代理给隐藏的原站 DOM。
- `DetailArticle` 已展示 `reply` 类型的“评论”操作，但点击后只是展开隐藏原页中的评论，OneFeed 没有消费评论数据。
- 原页面被隐藏而未卸载，因此 Adapter 仍可点击原站控件、观察 DOM 和驱动原站滚动加载。

2026-08-26 的知乎实页验证还确认了以下事实：

- 原站局部评论区域与“全部评论”弹层可能同时存在，同一评论会在两处重复出现；它们仅作为 Adapter 数据源，不直接展示。
- 评论 ID 位于包含 `.CommentContent` 的最近 `[data-id]` 祖先上；样式类大量使用构建哈希，不可作为主要选择器。
- 全部评论弹层拥有独立滚动容器，后续评论随该容器滚动继续加载。
- 弹层可能被挂载到回答节点之外，因此不能只在回答根节点下查找弹层。
- 评论总数在回答元数据、评论按钮和已打开评论区之间可能短暂不一致；打开后的评论区标题应作为当前展示值。

## 3. 核心决策

### 3.1 静态能力描述与动态评论快照分开

`ArticleDetail` 只增加一个轻量能力描述，声明当前内容是否能够在 OneFeed 内读取评论。实际评论条目不写回 `ArticleDetail`，避免每次原站加载评论都重新解析和替换整篇正文。

建议新增 `src/types/comments.ts`：

```ts
import type { FeedAuthor, FeedBlock, FeedMetric } from './feed';

export interface CommentThreadDescriptor {
  /** 与 DetailAdapter 运行时目标绑定的稳定 ID。 */
  targetId: string;
  /** 评论区打开前可获得的近似总数。 */
  count: number;
  capabilities: {
    preview: boolean;
    all: boolean;
    loadMore: boolean;
  };
}

export interface CommentItem {
  id: string;
  /** 扁平列表中的父评论；缺失表示顶层评论。 */
  parentId?: string;
  author: FeedAuthor;
  body: FeedBlock[];
  /** 保留 Adapter 可可靠读取的原站时间表示。 */
  publishedAt?: string | number;
  /** 原站直接展示但不适合强行标准化的短标签，如位置或“热评”。 */
  metadataLabels?: string[];
  metrics: FeedMetric[];
  /** 原站声明的直接回复数，可能大于当前已加载子回复数。 */
  replyCount?: number;
}

export interface CommentSnapshot {
  targetId: string;
  scope: 'preview' | 'all';
  total: number;
  /** 保持原站当前顺序；Renderer 以 id 去重。 */
  items: CommentItem[];
  hasMore: boolean;
}
```

`ArticleDetail` 增加：

```ts
comments?: CommentThreadDescriptor;
```

`CommentItem` 使用扁平结构而不是递归 `children`。这样增量加载时可以按 `id` 合并，子回复可用 `parentId` 归组，也不会因为原站只加载了半棵回复树而制造不完整的嵌套快照。

### 3.2 评论使用按需请求，不复用正文观察回调

在 `DetailAdapter` 上增加可选能力：

```ts
export type CommentCommand =
  | { kind: 'openPreview'; targetId: string }
  | { kind: 'openAll'; targetId: string }
  | { kind: 'loadMore'; targetId: string }
  | { kind: 'closeAll'; targetId: string };

export type CommentRequestResult =
  | { kind: 'loaded'; snapshot: CommentSnapshot }
  | { kind: 'exhausted'; snapshot: CommentSnapshot }
  | { kind: 'closed' }
  | { kind: 'failed'; retryable: boolean };

export interface DetailAdapter {
  init: () => void;
  disconnect: () => void;
  triggerAction: (itemId: string, actionId: string) => boolean;
  requestComments?: (command: CommentCommand) => Promise<CommentRequestResult>;
}
```

首期使用可选方法，避免为了一个平台改写所有已有 Detail Adapter。只有同时提供 `ArticleDetail.comments` 和 `requestComments` 的 Adapter 才会启用 OneFeed 评论面板。

请求返回评论快照，而不是依赖新的全局监听器，原因是评论加载都由 Renderer 的明确操作触发：展开、打开全部或触底加载。Adapter 可以在一次请求内部完成“点击原控件 -> 等待目标 DOM -> 解析 -> 返回结果”，Renderer 也能准确维护 loading、失败和重试状态。

### 3.3 Renderer 统一拥有交互状态

新增平台无关的 `CommentSection` 控制器和 `CommentsDialog`：

- `CommentSection` 保存弹窗开关、请求状态、首批快照和全部快照，不渲染文章底部区域。
- `CommentsDialog` 展示全部评论并监听自己的滚动容器；接近底部时只发出一次 `loadMore` 请求。
- `CommentItemView` 只渲染统一字段，用 `parentId` 组织当前已加载的子回复。

评论状态不进入 `useDetailStore`。它是按需、短生命周期的视图状态，放进正文 Store 会破坏“Adapter 提交完整详情快照、Store 直接替换”的现有约束。后续若 Thread 页面同时开放多个回答的评论，可再把同一个 Hook 的 reducer 提升为按 `targetId` 索引的 Store；首期无需提前引入该复杂度。

`DetailArticle` 只做语义分流，不做平台分流：

```ts
if (action.kind === 'reply' && content.comments) {
  comments.openDialog();
  return;
}
onAction(action);
```

如果没有评论能力描述，仍沿用当前 `triggerAction` 和 `openOriginal` 回退。`ActionBar` 不解析评论数据，也不感知知乎。

### 3.4 OneFeed 渲染自己的弹窗

原站弹层只作为隐藏的数据源和加载控制器，不移动到 Shadow DOM，也不通过 Portal 直接展示。OneFeed 弹窗负责：

- `role="dialog"`、`aria-modal="true"`、标题和关闭按钮。
- 打开后聚焦，`Escape` 关闭，关闭后把焦点还给文章操作区的“评论”按钮。
- 弹窗打开期间锁定 OneFeed 阅读视口，而不是修改原站页面布局。
- 弹窗打开后串行请求 `openPreview` 和 `openAll`：先显示首批快照，再用完整快照替换列表；用户无需理解原站的两段式控件。
- 关闭 UI 不等待原站；`closeAll` 仅用于尽力关闭隐藏的原站弹层和释放 Adapter 绑定。

## 4. 统一状态流

```text
ActionBar 的 reply 操作
        |
        v
CommentSection.openDialog() ---- dialog loading
        |
        v
DetailAdapter.requestComments(openPreview)
        |
        +-- Adapter 点击原站评论控件
        +-- 等待局部评论 DOM
        +-- 解析 CommentSnapshot(scope=preview)
        |
        v
CommentsDialog 展示首批评论
        |
        v
Renderer 自动继续请求完整评论
        |
        v
DetailAdapter.requestComments(openAll)
        |
        +-- 点击原站“全部评论”控件
        +-- 等待并绑定新出现的原站弹层
        +-- 解析 CommentSnapshot(scope=all)
        |
        v
CommentsDialog 展示全部评论
        |
        v
OneFeed 弹窗接近底部 -> loadMore 单请求锁
        |
        +-- Adapter 滚动原站弹层的内部滚动容器
        +-- 等待新增评论 ID 或确认无新增
        +-- Renderer 按 ID 追加去重
```

同一 `targetId + command.kind` 同时只能存在一个请求。组件卸载或路由切换时忽略晚到结果；Adapter `disconnect()` 必须中断等待中的 MutationObserver、timer 和滚动请求。

## 5. 知乎 Adapter 设计

建议把评论实现独立到 `src/content/adapters/zhihuComments.ts`，避免继续扩大 `zhihuDetail.ts`，并确保所有知乎选择器都停留在 Adapter 层。

### 5.1 能力声明

`parseZhihuDetail` 从回答元数据或评论按钮读取初始数量，并为回答详情增加：

```ts
comments: {
  targetId: `zhihu_${originId}`,
  count: commentCount,
  capabilities: {
    preview: true,
    all: true,
    loadMore: true,
  },
}
```

专栏文章只有在实页存在可代理的评论入口时才声明能力，不能仅因平台是知乎就默认开启。

### 5.2 选择器原则

优先依赖稳定语义边界，并始终限定到本次操作目标：

- 回答根：现有 `ANSWER_SELECTOR` 加 `data-zop.itemId` 校验。
- 评论入口：复用 `findActionControl(answerRoot, 'reply')`。
- 局部区域：回答根内的 `.Comments-container`。
- 评论条目：遍历 `.CommentContent`，取最近的 `[data-id]` 作为唯一条目根并按 ID 去重。
- 作者：条目根内头像与用户主页链接，不依赖 `css-*` 构建类。
- 全部评论弹层：点击前记录已有弹层，点击后绑定新出现且包含评论条目的 `.Modal-content`；若弹层已存在，则用目标评论 ID、标题数量和本次运行时绑定共同校验。
- 弹层滚动容器：在已绑定弹层内查找 `overflow-y` 为 `auto/scroll` 且 `scrollHeight > clientHeight` 的节点，不硬编码当前哈希类名。
- “全部评论”控件：在当前局部评论区域内按按钮可见文案匹配“全部 + 评论”，明确排除“查看全部 N 条回复”。

如果知乎某版第一次点击评论就直接创建完整弹层，`openPreview` 从该弹层截取当前已加载的首批条目生成 preview 快照；后续 `openAll` 复用已绑定弹层，不重复点击。

### 5.3 解析与去重

- 正文继续走清洗后的 Block 解析器；评论中的贴图作为图片 Block，不保留原站 class/style/script。
- 局部区域和完整弹层分别解析，不能把两个根节点一起查询。
- `CommentSnapshot.items` 在单次解析内按评论 ID 去重；Renderer 在多次 `loadMore` 之间再次去重。
- 评论区打开后优先使用评论区标题中的总数，打开前才使用回答元数据或评论按钮数量。
- `hasMore` 不能只通过 `items.length < total` 判断，因为总数可能包含未展开子回复或存在审核差异。Adapter 应结合原站滚动位置与一次触底后是否出现新评论 ID 判断；触底且等待后无新增时返回 `exhausted`。

### 5.4 失败与回退

- 找不到评论入口：不声明评论能力，保留原文入口。
- 展开超时或结构不匹配：返回 `failed`，Renderer 保留已成功加载的数据并提供“重试”和“在原文查看评论”。
- 找不到“全部评论”控件：弹窗保留已加载的首批评论并显示失败回退，不猜测点击其他按钮。
- 路由变化或 Adapter 断开：立即取消等待，不向已卸载 Renderer 回传结果。

## 6. 为什么不选其他方案

### 直接搬运原站评论 DOM

评论组件依赖原站样式、React Portal、事件上下文和滚动容器。移动节点容易破坏原站状态，也会把平台细节泄漏进主题层，因此不采用。

### 把评论塞进 `ArticleDetail` 并由 MutationObserver 持续重发全文

全部评论滚动时 DOM 变化频繁，这会反复清洗正文、替换详情 Store 并触发不必要的整页渲染，因此评论采用独立按需结果。

### 直接请求知乎内部 API

内部接口、鉴权、签名和返回结构不属于稳定契约，还可能要求扩大权限。首期继续使用当前项目已经验证过的“原站 DOM 负责加载，Adapter 负责读取”方式。

### 复用 `ThreadDetail`

知乎回答详情的主体仍是单篇文章，评论只是正文下的延迟集合。把它提升为 Thread 会混淆顶部实体、阅读进度、触底行为和 URL 语义。

## 7. 实施顺序

1. 新增评论类型、`requestComments` 可选契约和纯 Renderer 假数据测试。
2. 完成知乎首批评论解析与 `openPreview`，验证评论入口、空状态和失败回退。
3. 完成 OneFeed 统一评论弹窗、知乎原站弹层绑定与滚动增量加载。
4. 在真实知乎回答页做浏览器级验证，再评估子回复展开、排序和评论互动。

每一步都应保持其他 Detail Adapter 无需修改或只需通过类型检查。

## 8. 验收标准

### 协议与 Renderer

- 评论协议完全可序列化，不包含 DOM 节点、事件处理器或平台 selector。
- 用一个非知乎的假 Adapter 数据即可在同一弹窗内完成首批评论、完整评论和增量评论渲染。
- Renderer 源码没有 `zhihu`、`.Comments-container` 或 `.Modal-content` 分支。
- 文章底部不渲染评论区，也不提供额外的“查看全部评论”按钮。
- 重复 ID 在首批/完整快照和多次加载之间只显示一次。
- loading、空、失败、重试、无更多数据均有确定状态。
- 弹窗支持键盘关闭、焦点恢复和滚动请求锁。

### 知乎 Adapter

- 点击 OneFeed 的评论按钮后立即展示 OneFeed 弹窗，并自动完成原站首批评论与完整评论加载，原站评论区域和弹层保持隐藏。
- 弹窗触底可连续加载且不会并发触发相同请求。
- 局部区域与弹层同时存在时不会串读或重复。
- 哈希样式类变化时，基于评论 ID、正文和语义按钮的解析测试仍可通过。
- Adapter 断开后不再回调，也不会保留 MutationObserver、timer 或滚动绑定。

### 回归验证

- `npm run compile`
- `npm test`
- `npm run lint`
- 知乎回答详情手工验证：0 条评论、少量评论、大量评论、包含子回复、未登录可读和登录态页面。

测试夹具必须脱敏，不得复制真实用户名、头像或评论正文。
