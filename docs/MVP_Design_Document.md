# 最小可行性产品 (MVP) 设计方案文档

## 1. 项目定位与核心目标
* **项目名称**：OneFeed
* **核心命题**：**“把所有信息流网站，统一成一种你喜欢的阅读体验。”**
* **MVP 核心目标**：
  1. 验证“解析 DOM -> 归一化 JSON -> 重新渲染 UI”技术路径的可行性与稳定性。
  2. 验证“完全隐藏原 DOM，在 Shadow DOM 中接管全局渲染”的交互流畅度与性能开销。
  3. 以极小的开发成本，在 4 个典型平台（知乎、Twitter/X、V2EX、Linux DO）上提供一致的极简阅读体验。

---

## 2. MVP 功能范围 (Scope)

| 功能模块 | MVP 实施范围 | 非 MVP 范围 (暂不实现) |
| :--- | :--- | :--- |
| **支持平台** | 知乎（回答/文章流、回答详情、专栏文章详情）、Twitter/X（Home Feed）、V2EX（主题列表）、Linux DO（话题列表） | X、V2EX、Linux DO 详情页；B站、YouTube、Reddit、小红书等 |
| **渲染主题** | **1 款默认主题**：Notion 风格（极简、无框、黑白灰高留白） | 主题市场、自定义 CSS/JS、多主题切换 |
| **数据解析** | 独立的 Feed/Detail 静态选择器适配器（首个 Detail Adapter 为 ZhihuDetailAdapter） | AI 自动解析、云端规则库更新 |
| **核心交互** | 基础滚动、图片预览、Feed 卡片原网页点赞/评论代理、知乎详情赞同代理；Popup 开关与统一视图内“查看原页面”入口 | Detail 评论区接管、复杂富文本编辑、视频内嵌播放 |
| **数据持久化**| 本地存储 (chrome.storage.local) 记录启用状态与主题偏好 | 云端同步、知识库导出 (Notion/Obsidian) |

---

## 3. 系统架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                    当前 URL + 网页原始 DOM                  │
└──────────────────────────────┬──────────────────────────────┘
                               │ 1. URL 级 Surface 识别
                  ┌────────────┴────────────┐
                  ▼                         ▼
        Feed Adapter / FeedItem   Detail Adapter / ArticleDetail
                  │                         │
        useFeedStore / FeedApp    useDetailStore / DetailApp
                  └────────────┬────────────┘
                               │ 2. 独立响应式更新
┌──────────────────────────────▼──────────────────────────────┐
│                    Shadow DOM 隔离层                        │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │            Feed Renderer 或 Detail Renderer             │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 3.1 数据归一化 Schema (`types/feed.ts`)

共享协议按“内容语义 + 内容区块 + 指标/操作描述”拆分。`kind` 只表示内容结构，不表示页面层级。Feed 与 Detail 使用独立顶层模型：`FeedItem` 是原信息流卡片快照，其区块命名为 `previewBlocks`；`ArticleDetail` 是独立详情页正文，其区块命名为 `body`。两者共享 `FeedBlock`、作者、指标和操作描述，但不进行列表到详情的数据升级或合并。

```typescript
export interface FeedAuthor {
  name: string;
  avatar: string;
  link?: string;
}

export type ContentKind = 'post' | 'article' | 'discussion';

export type FeedBlock =
  | { type: 'richText'; html: string; plainText: string }
  | { type: 'gallery'; items: FeedImage[] }
  | { type: 'video'; media: FeedVideo }
  | { type: 'linkPreview'; preview: FeedLinkPreview }
  | { type: 'quote'; item: FeedItemSummary }
  | { type: 'poll'; poll: FeedPoll };

export type FeedMetricKind =
  | 'reactions'
  | 'replies'
  | 'reposts'
  | 'views'
  | 'score';

export type FeedActionKind =
  | 'react'
  | 'reply'
  | 'repost'
  | 'bookmark'
  | 'share'
  | 'open';

export interface FeedItem {
  id: string;               // 格式: ${platform}_${originId}
  platform: string;         // 与当前 Adapter 注册的 source.id 一致
  source: FeedSourceRef;
  originalUrl: string;
  kind: ContentKind;
  author: FeedAuthor;
  context?: FeedContext;    // 社区、标签、推荐/转发/置顶原因
  publishedAt?: string | number;
  updatedAt?: string | number;
  title?: string;
  previewBlocks: FeedBlock[];
  metrics: Array<{ kind: FeedMetricKind; value: number; label?: string }>;
  actions: Array<{
    id: string;
    kind: FeedActionKind;
    variant?: 'like' | 'agree' | 'upvote' | 'downvote';
    label: string;
    count?: number;
    active?: boolean;
    enabled: boolean;
    fallback?: 'openOriginal';
  }>;
  flags?: FeedFlags;        // 敏感内容、剧透、锁定、置顶等状态
}

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
```

MVP 首先实现 `post`、`article`、`discussion` 三种结构，以及 `richText`、`gallery` 两类 Block；其余 Block 是后续平台扩展的稳定协议，不要求在首版一次完成。知乎映射为 `article`，Twitter/X 映射为 `post`，V2EX 与 Linux DO 映射为 `discussion`。

`FeedItem` 与 `ArticleDetail` 必须保持可序列化。原站 `Element`、按钮节点和点击代理不得写入 Schema；各 Surface Adapter 在独立运行时 Registry 中维护 `item.id -> 原始节点/动作句柄` 映射。详情页需要完整内容时只解析当前详情 DOM，不依赖或合并此前列表状态。

### 3.2 Adapter 扩展契约

站点差异统一限制在 `src/content/adapters/` 内，内容脚本和渲染层不包含站点分支：

* `BaseAdapter` 只负责 Feed 卡片的初次扫描、`MutationObserver` 防抖监听和断开清理；详情页使用独立 `DetailAdapter` 契约，不能把详情 DOM 强行兼容进 Feed Adapter。
* 每个 Adapter Definition 使用完整 `URL` 匹配页面，而不是只按域名匹配。详情规则优先于 Feed 规则，设置页等未支持路由不得挂载统一视图。
* `registry.ts` 是唯一注册入口。`createAdapter(url, listeners)` 返回带 `surface: 'feed' | 'detail'` 的判别联合，分别写入 `useFeedStore` 或 `useDetailStore`。
* DOM 选择器、计数格式和站点回退逻辑不得进入内容脚本、状态库或主题组件。

增加新网站时，只需新增对应 Adapter 文件及解析测试、在 `registry.ts` 注册定义，并在 WXT 内容脚本入口 `src/entrypoints/content.tsx` 声明明确的站点匹配权限；无需修改挂载、状态管理或渲染核心逻辑。

### 3.3 启用、关闭与故障回退

统一信息流必须始终提供可恢复到原网页的逃生路径：

* 扩展 Popup 提供持久化开关，用户可以在原页面和 OneFeed 统一视图之间切换。
* 受支持页面右侧常驻一个悬浮开关，显示当前启用状态，并允许用户无需打开 Popup 即时切换；开关使用独立 Shadow DOM，不随 Feed 或 Detail 视图卸载。
* 统一视图顶部提供“查看原页面”按钮，即使解析结果为空或布局异常，用户也能立即退出。
* 关闭时停止 Adapter 与 `MutationObserver`、卸载 React Root、移除 Shadow DOM Host 和原页面隐藏样式，并清空当前 Surface 状态。
* 重新开启时重新执行挂载与解析流程，无需刷新页面。
* WXT `wxt:locationchange` 触发时，内容脚本按 `origin + pathname + search` 销毁旧 Surface 并重新识别页面；hash-only 跳转不重挂载。
* 从支持路由进入站内未支持路由时，只恢复原页面，不修改用户持久化的启用状态；再次进入支持路由后自动接管。
* Detail Adapter 首次成功产出正文前保持 OneFeed Host 隐藏且不隐藏原页面；目标节点缺失或解析失败时，用户继续看到可操作的原详情页。
* 挂载或 Adapter 初始化抛出异常时，默认关闭统一信息流并自动恢复原页面，不能留下空白页或不可操作的遮罩。
* 启用状态保存在 `chrome.storage.local`，页面刷新和浏览器重启后沿用用户最后一次选择。

---

## 4. MVP 代码骨架结构

```text
onefeed-extension/
├── wxt.config.ts               # WXT 与 Manifest 公共配置
├── package.json
├── tsconfig.json
├── src/
│   ├── entrypoints/            # WXT 文件式扩展入口
│   │   ├── background.ts       # Background Service Worker
│   │   ├── content.tsx         # 站点权限与 Content Script 生命周期
│   │   └── popup/              # 扩展 Popup 控制面板
│   ├── content/                # Content Script 核心接管逻辑
│   │   ├── index.tsx           # Shadow DOM 创建与清理
│   │   ├── adapters/           # 站点解析适配器
│   │   │   ├── base.ts         # BaseAdapter 抽象类
│   │   │   ├── detail.ts       # DetailAdapter 契约
│   │   │   ├── zhihu.ts        # 知乎 DOM 提取
│   │   │   ├── zhihuDetail.ts  # 知乎回答/专栏详情提取
│   │   │   ├── twitter.ts      # Twitter DOM 提取
│   │   │   ├── v2ex.ts         # V2EX DOM 提取
│   │   │   └── linuxDo.ts      # Linux DO DOM 提取
│   ├── renderer/               # React 统一渲染组件
│   │   ├── FeedApp.tsx         # Feed Surface Shell
│   │   ├── DetailApp.tsx       # Detail Surface Shell
│   │   ├── store/              # Zustand 状态管理
│   │   │   ├── useFeedStore.ts
│   │   │   └── useDetailStore.ts
│   │   └── themes/             # 主题渲染模板
│   │       └── FocusPaper/      # MVP 默认主题
│   │           ├── Card.tsx
│   │           ├── DetailArticle.tsx
│   │           └── Header.tsx
│   └── types/                  # 共享积木与独立 Surface 模型
│       ├── feed.ts
│       └── detail.ts
└── public/icons/               # Manifest 图标
```

---

## 5. MVP 关键代码实现示例

### 5.1 Content Script 注入入口与 Shadow DOM 挂载 (`src/content/index.tsx`)
下例聚焦 Surface 分流，`createReaderRoot` 代表实际实现中的 Shadow DOM Host、样式注入与清理样板。

```typescript
import { createRoot } from 'react-dom/client';
import DetailApp from '../renderer/DetailApp';
import FeedApp from '../renderer/FeedApp';
import { useDetailStore } from '../renderer/store/useDetailStore';
import { useFeedStore } from '../renderer/store/useFeedStore';
import { createAdapter } from './adapters/registry';

function mountCurrentSurface() {
  // 先按完整 URL 识别页面；未支持路由保持原页面不变。
  const activeAdapter = createAdapter(new URL(window.location.href), {
    onFeedItems: (items) => useFeedStore.getState().addFeedItems(items),
    onDetail: (content) => useDetailStore.getState().setContent(content),
  });
  if (!activeAdapter) return;

  // 创建 Shadow DOM、注入主题样式并隐藏原页面；清理函数执行相反操作。
  const { host, viewport, cleanup } = createReaderRoot();
  activeAdapter.adapter.init();

  const props = {
    scrollElement: viewport,
    source: activeAdapter.source,
    onDisable: () => chrome.storage.local.set({ enabled: false }),
    onAction: (itemId: string, actionId: string) => (
      activeAdapter.adapter.triggerAction(itemId, actionId)
    ),
  };
  createRoot(viewport).render(
    activeAdapter.surface === 'feed'
      ? <FeedApp {...props} />
      : <DetailApp {...props} />,
  );

  return () => {
    activeAdapter.adapter.disconnect();
    cleanup(host);
  };
}
```

### 5.2 知乎 Adapter 提取逻辑 (`src/content/adapters/zhihu.ts`)
```typescript
import type { FeedItem } from '../../types/feed';
import { BaseAdapter, type AdapterDefinition } from './base';

const CARD_SELECTOR = '.TopstoryItem, .AnswerItem, .ArticleItem, .ContentItem';

export class ZhihuAdapter extends BaseAdapter {
  protected readonly cardSelector = CARD_SELECTOR;

  parseCard(element: Element): FeedItem | null {
    return parseZhihuCard(element);
  }

  triggerAction(itemId: string, actionId: string): boolean {
    return triggerZhihuAction(this.getRuntimeElement(itemId), actionId);
  }
}

export const zhihuAdapterDefinition: AdapterDefinition = {
  source: {
    id: 'zhihu',
    name: '知乎',
    homeUrl: 'https://www.zhihu.com/',
  },
  matches: (url) => [
    'zhihu.com',
    'www.zhihu.com',
  ].includes(url.hostname) && ['/', '/follow', '/hot', '/recommend'].includes(url.pathname),
  create: (onItems) => new ZhihuAdapter(onItems),
};
```

知乎详情由 `zhihuDetail.ts` 独立处理。回答路由 `/question/:questionId/answer/:answerId` 必须按 URL 中的 `answerId` 从同页多个 `.AnswerItem` 中精确选择主回答；专栏路由 `/p/:articleId` 只解析匹配的 `.Post-content`。两者输出 `ArticleDetail.body`，不调用 Feed Store，也不将详情正文回写到 `FeedItem.previewBlocks`。

---

## 6. MVP 开发迭代计划与验收标准

### 0.1 首版交付说明

首版按平台拆分交付：`0.1.0` 先完成知乎回答/文章流，后续迭代已接入 Twitter/X Home Feed、V2EX 主题列表与 Linux DO 话题列表。该拆分不改变“多平台归一化”的 MVP 总目标，先用单平台验证完整链路，再复用统一 Adapter 契约扩展社区类平台：

- WXT + React + TypeScript + Manifest V3 可构建项目；
- 知乎 DOM 静态适配、字段清洗、稳定 ID 与响应式去重；
- 知乎回答/专栏详情使用独立 `ArticleDetail`、Detail Store 与 Detail Renderer；
- Shadow DOM 全屏接管与 Focus Paper 默认主题；
- 图片预览、Feed 原站点赞/评论代理、知乎详情赞同代理、接近底部时同步原信息流加载；
- `chrome.storage.local` 保存启用状态，Popup 支持即时开关；
- 适配器解析、数量转换与去重逻辑的自动化测试；
- Feed → Detail、Detail → Feed 与支持路由 → 未支持路由的 SPA 生命周期测试。

生产构建产物位于 `.output/chrome-mv3/`，可作为已解压扩展加载到 Chrome；`wxt zip` 生成 Chrome Web Store 上传包。

### 迭代周期：4 周

* **Week 1: 基础设施建设**
  * 搭建 WXT + React + TypeScript + Chrome Extension Manifest V3 脚手架。
  * 完成 Shadow DOM 挂载与原生 DOM 隐藏防闪烁逻辑。
  * 完成 Popup 开关、页内退出入口与异常自动恢复原页面逻辑。
  * 定义独立 `FeedItem`、`ArticleDetail` Schema 与两套 Zustand Store 数据流。

* **Week 2: 适配器编写 (知乎、Twitter、V2EX 与 Linux DO)**
  * 编写 `ZhihuAdapter`、`TwitterAdapter`、`V2exAdapter` 与 `LinuxDoAdapter`。
  * 编写 `ZhihuDetailAdapter`，验证回答和专栏详情的独立解析与渲染。
  * 实现基于 `MutationObserver` 的异步卡片提取与去重逻辑。
  * 验证原网页底层 API / 节点的代理点击（如触发点赞）。

* **Week 3: Notion 极简主题渲染**
  * 实现基于 Shadow DOM 的 Notion 风格 UI（卡片、标题、作者、图片网格）。
  * 引入虚拟列表，优化滚动性能与卡片加载体验。

* **Week 4: 端到端测试与体验调优**
  * 测试长文本、多图卡片在统一 UI 下的排版一致性。
  * 验证关闭后原页面立即恢复、重新开启无需刷新，以及挂载异常不会遮挡原页面。
  * 验证 SPA 路由切换会销毁旧 Surface，站内未支持页面保持原样。
  * 修复内存泄漏与 MutationObserver 频繁触发的性能瓶颈。
  * 交付打包产物，在 Chrome 浏览器中加载测试。

---
