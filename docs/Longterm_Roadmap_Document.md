# OneFeed 长期产品路线图 (Long-term Roadmap)

## 1. 整体战略远景
OneFeed 将成为 **Web 时代跨平台信息流的通用浏览器 Launcher 与 AI 内容操作系统**。通过彻底解耦 UI 渲染与数据采集，把信息控制权、视觉表达权与内容筛选权完整还给用户。

---

## 2. 演进路线图总览

```
[Phase 1: MVP - 核心可行性验证]
  │ (已知：数据解析 -> Shadow DOM -> Notion 单主题)
  ▼
[Phase 2: Theme Engine & Multi-Platform] ─── (体验拓展)
  │ (丰富主流平台，开启主题生态，支持自定义 CSS/布局)
  ▼
[Phase 3: AI Engine & Intelligence] ────── (核心护城河)
  │ (AI 智能降维、脱水、自动生成 Adapter、语义级降噪)
  ▼
[Phase 4: Ecosystem & Monetization] ─────── (商业化闭环)
  │ (主题市场、Pro 订阅服务、云端 Adapter 静默更新、知识库联动)
```

---

## 3. 分阶段深度规划

### Phase 1: MVP 验证与技术打通 (已规划)
* **核心目标**：验证“完全隐藏原 DOM，在 Shadow DOM 中接管全局渲染”的工程可行性。
* **覆盖平台**：知乎、Twitter/X、V2EX、Linux DO。
* **核心交付**：1 款 Notion 风格基础主题，打通 Feed Surface，并以知乎回答/专栏验证 Article Detail，以知乎问题、V2EX 主题和 Linux DO 话题验证 Thread Detail。
* **安全回退**：Popup 与页面右侧常驻悬浮开关提供关闭入口；统一视图不重复显示产品 Header 或退出按钮。关闭后立即卸载接管层并恢复原页面，初始化异常时自动回退，用户可随时重新开启。
* **交付顺序**：`0.1.0` 先交付知乎完整链路，后续迭代已通过统一 Adapter 注册契约接入 Twitter/X、V2EX 与 Linux DO，并将 V2EX、Linux DO 社区主题纳入 Thread Detail；单平台首发用于降低同时调试多个动态 DOM 的风险，社区列表与详情适配继续验证该契约的扩展能力。
* **工程基础**：使用 WXT 的文件式入口、Manifest 生成、开发加载和发布打包能力承载扩展工程，为后续按浏览器生成独立构建保留统一入口。
* **扩展边界**：Feed、Article Detail 与 Thread Detail 共享 Block、内容角色、作者、指标和操作描述，但使用独立顶层模型与 Renderer。新增路由通过完整 URL 注册到对应 Surface；未支持路由不得被域名级兜底接管。

---

### Phase 2: 渲染引擎强化与平台大扩张 (0 ~ 6 个月)

#### 1. 目标平台扩展 (Platform Expansion)

平台覆盖分为三个层级：

* **Schema 可表达**：Feed 使用 `kind + role + previewBlocks + metrics + actions` 描述列表卡片；单篇详情使用 `ArticleDetail.body`，问题/主题详情使用 `ThreadDetail.header + entries`，仍需单独开发 Adapter、解析测试和原站操作代理。
* **需要标准 Block 扩展**：仍属于通用 Feed，但必须先新增可复用 Block 或状态协议。
* **需要专用 Surface**：核心交互不是卡片式 Feed，不应为了扩大平台数量而强行塞入通用 Card。

##### Schema 可直接表达的平台

| 产品类型 | 可覆盖产品 | 主要映射 |
| :--- | :--- | :--- |
| 短动态与开放社交 | Twitter/X、微博、Threads、Bluesky、Mastodon | `post` + `richText/gallery/video/linkPreview/quote/poll` |
| 论坛与社区 | Reddit、V2EX、Linux DO/Discourse、Hacker News、知乎问题 | Feed 使用 `discussion`；详情使用 `ThreadDetail` 的 `topic/question -> reply/answer` 角色关系 |
| 长文与订阅内容 | 知乎专栏、Medium、Substack、WordPress、RSS/Atom、微信公众号网页版 | Feed 使用 `article + previewBlocks`；受支持详情使用 `ArticleDetail.body` |
| 视频与图片 Feed | YouTube Home、B站首页/动态、Instagram 基础 Feed、小红书基础 Feed、Pinterest | `post/article` + `gallery/video`；只覆盖 Feed 卡片，不承诺完整播放器体验 |
| 职业内容 Feed | LinkedIn 基础动态、文章、图片、视频和投票 | `post/article` + Context + 标准 Blocks；文档、职位和活动卡片另行扩展 |

以上平台“可覆盖”仅表示统一数据和 UI 协议足以表达其主要 Feed 内容，不表示已经完成目标站点适配，也不表示其所有操作都可以在 Shadow DOM 中可靠代理。

##### 需要新增标准 Block 的平台

| 标准扩展 | 代表产品 | 新增能力 |
| :--- | :--- | :--- |
| `live` | Twitch、YouTube Live、B站直播 | 直播中/预告/结束、实时观看人数、计划时间、直播间入口 |
| `audio` | Spotify、Apple Podcasts、SoundCloud、Tumblr Audio | 音频源、时长、节目/专辑、播放进度 |
| `document` | LinkedIn Document、SlideShare、论坛附件 | 文件类型、页数、大小、预览与下载/原文回退 |
| `verticalVideo` 展示策略 | TikTok、抖音、Reels、Shorts | 竖屏比例、自动播放策略、上下切换和播放状态；底层仍复用 `video` 数据 |
| `product` | Pinterest Product Pins、Instagram Shopping、小红书商品笔记 | 商品、价格、商家、库存/时效提示和外部购买入口 |
| `reference` | LinkedIn 职位/活动、社区事件卡片 | 引用对象类型、状态、时间地点和主操作 |

##### 不纳入通用 Card 的产品

* Slack、Discord、Microsoft Teams：核心是频道、连续消息、会话线程和成员状态，应使用 Chat/Thread Surface。
* Gmail、Outlook：核心是邮件会话、收件人、附件和邮件状态，应使用 Mail Surface。
* 淘宝、Amazon 等交易首页：核心是价格、库存、规格、购物车和支付，不应由阅读型 Feed Schema 承担交易语义。

#### 2. Adapter 交付顺序

| 迭代 | 目标 | 平台交付 | 验收重点 |
| :--- | :--- | :--- | :--- |
| **2.0 统一协议** | 完成 Schema、Surface 与 Renderer 解耦 | 迁移知乎、Twitter/X、V2EX、Linux DO | `FeedItem`/`ArticleDetail`/`ThreadDetail` 可序列化；URL 路由互斥；SPA 切换清理旧 Surface；Block Registry 与 Action Bar 跨 Surface 复用 |
| **2.1 讨论型扩展** | 验证 `discussion` 通用性 | Reddit、Hacker News | 社区/标签、分数、回复、投票、剧透/锁定和链接帖降级 |
| **2.2 开放社交扩展** | 验证复杂 `post` 通用性 | Mastodon、Bluesky | 引用、转发原因、内容警告、可见范围、链接卡片、图片比例和投票 |
| **2.3 视频扩展** | 验证媒体 Block 与播放器代理 | YouTube、B站 | 封面、时长、字幕/直播状态、播放量、原生播放器 Portal 与回退 |
| **2.4 视觉内容扩展** | 验证高密度图片/短视频布局 | Instagram、小红书、Pinterest | 多图比例、竖屏视频、收藏/外链、敏感内容和商品信息降级 |
| **2.5 内容订阅扩展** | 验证文章与开放订阅源 | RSS/Atom、Medium、Substack、WordPress | Feed 摘要与 Detail/RSS 全文独立解析；作者与来源、发布时间、已读/稍后读和重复文章处理 |

Phase 2 的正式 KPI 仍以至少 8 个稳定 Adapter 为准：优先完成当前 4 个平台和 2.1、2.2 的四个平台。2.3 之后的平台按真实用户需求、目标站点政策和 Adapter 维护成本逐步进入正式支持，不以 Schema 理论覆盖数冒充已交付平台数。

建模依据包括 [ActivityStreams 2.0](https://www.w3.org/TR/activitystreams-core/)、[Mastodon Status](https://docs.joinmastodon.org/entities/Status/)、[Bluesky Posts](https://docs.bsky.app/docs/advanced-guides/posts)、[Reddit Post](https://developers.reddit.com/docs/api/redditapi/models/classes/Post)、[Hacker News API](https://github.com/HackerNews/API)、[LinkedIn Posts API](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api)、[YouTube Video](https://developers.google.com/youtube/v3/docs/videos)、[Twitch API](https://dev.twitch.tv/docs/api/reference/) 与 [Atom RFC 4287](https://www.rfc-editor.org/rfc/rfc4287)。

#### 3. 主题引擎 (Theme Engine & System Styles)
主题包必须分别声明支持的 Surface。Feed 主题负责卡片密度和预览截断；Article Detail 负责单篇正文排版；Thread Detail 负责固定主题头、回答/回复列表和分页。三者共享视觉 Token 和 Block Renderer，不要求使用相同顶层布局。

内置 6 款精心调优的高质感视觉主题：
* **Notion Style**：极简折叠、无框卡片、灰白克制留白；列表 Card 按标题、正文、元信息三行组织，作者只显示在第三行且不显示头像，独立“查看原文”操作由标题链接替代；短纯文本自动采用紧凑密度。
* **Apple Design Style**：毛玻璃（Backdrop Filter）、大圆角、流畅微交互。
* **Terminal / Hacker Style**：纯黑背景、等宽字体、绿/橙高亮、ASCII 分隔符。
* **Newspaper / Paper Style**：双列报纸排版、复古衬线体、纸质肌理背景。
* **Cyberpunk Style**：高饱和霓虹色调、科幻边框。
* **Minimal Clean**：极致文本流，去除一切视觉干扰。

#### 4. 架构优化与交互代理
* **SPA Surface 生命周期**：使用 WXT 路由事件按完整 URL 识别页面，依次销毁旧 Adapter/Store/Renderer、恢复原 DOM，再挂载新 Surface；hash-only 跳转不重建页面。Article/Thread Detail 只有在 URL 对应的目标节点解析成功后才遮罩原页，避免 DOM 延迟或规则失效造成空白详情。
* **视频播放器节点搬运 (Portal)**：对于 B站/YouTube 视频，通过 DOM `appendChild` 将原平台的播放器节点无缝“移驾”到新 UI 卡片中，保留原生播放状态与清晰度选项。
* **触底加载同步 (Scroll Synchronization)**：当用户在新 UI 滚动到底部时，自动向被隐藏的原 DOM 派发滚动事件，实现无缝无限翻页。

---

### Phase 3: AI 驱动的内容操作系统 (6 ~ 12 个月)

#### 1. AI 智能降维与注意力保护 (Attention Shield)
* **3句式 AI 摘要与卡片脱水**：长文、视频动态自动在卡片顶部生成精炼摘要与逻辑导图；必须标注输入来自 Feed `previewBlocks` 还是 Detail `body`，避免将截断预览当作全文摘要。
* **标题党还原 (De-clickbaiting)**：AI 将夸张、悬念式标题自动改写为客观陈述句，并打上“情绪指数”标签。
* **跨平台事件去重 (De-duplication)**：识别微博、知乎、Twitter 上的同名热点，归并为单一“事件卡片”，展开可查看各平台讨论。

#### 2. AI 动态 Adapter 自动生成 (Self-healing Parser)
* **自动修复失效选择器**：当目标网站更新 DOM 导致提取失败时，截取 HTML 片段发送给轻量 LLM (如 GPT-4o-mini)，自动分析生成新 XPath/选择器并缓存。
* **零代码适配新网站**：用户输入任意未适配网址，AI 在 5 秒内自动生成临时解析规则。

#### 3. 个人化算法接管 (BYO-Algorithm)
* **信息密度/硬核度滑块 (0% ~ 100%)**：实时过滤低质、纯情绪化短文，只留硬核数据与逻辑分析长文。
* **语义级黑白名单**：基于上下文语义（而非单字匹配）过滤指定话题。

---

### Phase 4: 开发者生态与商业化变现 (12 个月+)

#### 1. 商业化模式 (Monetization Strategy)

```
                       ┌─────────────────────────┐
                       │   Freemium 模式架构      │
                       └────────────┬────────────┘
                                    │
            ┌───────────────────────┴───────────────────────┐
            ▼                                               ▼
┌─────────────────────────┐                     ┌─────────────────────────┐
│     免费版 (Free)        │                     │   Pro 订阅版 ($8/月)    │
├─────────────────────────┤                     ├─────────────────────────┤
│ · 3 个基础平台适配      │                     │ · 全平台无限制适配      │
│ · 2 款默认基础主题      │                     │ · 全套高端主题库        │
│ · 基础 DOM 净化与广告屏蔽│                     │ · AI 摘要/标题脱水/去重 │
└─────────────────────────┘                     │ · 云端 Selector 自动修复│
                                                │ · Obsidian/Notion 一键导出│
                                                └─────────────────────────┘
```

#### 2. 插件主题生态 (Theme Hub & Developer API)
* 开放 **Theme SDK**，允许社区开发者使用 React + Tailwind CSS 开发自定义主题并上传 Marketplace。
* 提供主题收益分成机制，吸引顶级 UI 设计师入驻。

#### 3. 跨平台知识工作流 (Knowledge Management Linkage)
* **一键无痕剪藏**：结构化 JSON 数据一键转化为标准 Markdown，无缝同步至 Notion、Obsidian、Logseq。
* **Ask Feed (信息流对话)**：允许用户向全天刷过的所有信息流发起对话提问（如：“总结我今天刷到的所有 AI 相关资讯”）。

---

## 4. 关键指标与里程碑 (Milestones & KPIs)

| 阶段 | 目标节点 | 关键 KPI 指标 |
| :--- | :--- | :--- |
| **Phase 1** | M1 - M2 | 完成 MVP 开发，知乎/Twitter/V2EX/Linux DO 渲染成功率 > 95%，卡片解析延迟 < 100ms。 |
| **Phase 2** | M3 - M6 | 交付至少 8 个稳定 Adapter，Schema 可表达 20 余个主流产品的基础 Feed，内置 6 款主题，获得 10,000+ 活跃用户 (WAU)。 |
| **Phase 3** | M7 - M10 | 上线 AI 摘要与过滤功能，端到端解析修复成功率 > 90%，留存率 (D30) > 35%。 |
| **Phase 4** | M11 - M12 | 推出 Pro 订阅，转化率达到 3% - 5%，开放 Theme Marketplace 开发者社区。 |
