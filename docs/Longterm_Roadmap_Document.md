# OneFeed 长期产品路线图 (Long-term Roadmap)

## 1. 整体战略远景
OneFeed 将成为 **Web 时代跨平台信息流的通用浏览器 Launcher 与 AI 内容操作系统**。通过彻底解耦 UI 渲染与数据采集，把信息控制权、视觉表达权与内容筛选权完整还给用户。

---

## 2. 演进路线图总览

```
[Phase 1: Core Foundation - 核心能力与架构基线]
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

### Phase 1: 核心能力与架构基线 (已完成)
* **核心目标**：验证“完全隐藏原 DOM，在 Shadow DOM 中接管全局渲染”的工程可行性。
* **覆盖平台**：知乎、Twitter/X、V2EX、Linux DO。
* **核心交付**：1 款 Notion 风格基础主题，打通 Feed Surface，并以知乎回答/专栏验证 Article Detail，以知乎问题、V2EX 主题和 Linux DO 话题验证 Thread Detail。
* **安全回退**：浏览器工具栏图标打开启动中心，启动中心总开关与页面右侧常驻悬浮开关共同切换全局接管状态。暂停后立即卸载接管层并恢复原页面，初始化异常时自动回退，用户可随时重新开启；该状态不会在 Chrome 中禁用扩展本身。
* **首次激活**：首次安装后自动打开扩展内欢迎页，通过安装成功反馈、产品愿景、可点击的平台目录、三步使用说明、核心能力和本地隐私承诺，引导用户前往无需登录的 Hacker News 立即体验。欢迎页只在首次安装时出现，扩展升级不主动打断用户。
* **日常启动**：独立启动中心承接工具栏入口，按“继续阅读、最近使用、更多网站”组织已支持平台，并提供全局状态、明暗外观、使用指南和反馈入口；最近使用只保存在本地。
* **交付顺序**：`0.1.0` 先交付知乎完整链路，后续迭代已通过统一 Adapter 注册契约接入 Twitter/X、V2EX 与 Linux DO，并将 V2EX、Linux DO 社区主题纳入 Thread Detail；单平台首发用于降低同时调试多个动态 DOM 的风险，社区列表与详情适配继续验证该契约的扩展能力。
* **工程基础**：使用 WXT 的文件式入口、Manifest 生成、开发加载和发布打包能力承载扩展工程，为后续按浏览器生成独立构建保留统一入口。
* **扩展边界**：Feed、Article Detail 与 Thread Detail 共享 Block、内容角色、作者、指标和操作描述，但使用独立顶层模型与 Renderer。新增路由通过完整 URL 注册到对应 Surface；未支持路由不得被域名级兜底接管。

---

### Phase 2: 渲染引擎强化与平台扩张 (当前阶段)

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
| **基础能力（已完成）** | 完成 Schema、Surface 与 Renderer 解耦 | 知乎、Twitter/X、V2EX、Linux DO | `FeedItem`/`ArticleDetail`/`ThreadDetail` 可序列化；URL 路由互斥；SPA 切换清理旧 Surface；Block Registry 与 Action Bar 跨 Surface 复用 |
| **2.1 微博适配（已完成）** | 扩展国内开放社交覆盖 | 微博 | 图文、视频、引用、转发原因、互动数据、原站操作代理与无限加载 |
| **2.2 小红书适配（已完成）** | 验证高密度视觉内容 | 小红书 | 发现页图文/视频封面、媒体比例、点赞代理、收藏/原文回退与非标准卡片降级 |
| **2.3 Hacker News 适配（已完成）** | 验证轻量社区列表与 HTML 文档分页 | Hacker News | News/Newest/Front/Best/Ask/Show/Jobs 列表、More 连续分页、分数与评论、赞同代理和详情原页回退 |
| **2.4 Reddit 适配（已完成）** | 验证海外社区 Feed 与 Shreddit Web Component | Reddit | 首页与社区 Feed、文本/外链/图片/视频封面、社区和作者上下文、分数与评论、赞同代理；帖子详情分阶段接入 |
| **2.5 哔哩哔哩适配** | 验证媒体 Block 与播放器代理 | 哔哩哔哩 | 首页与动态 Feed、封面、时长、播放量、原生播放器 Portal 与回退 |
| **2.6 YouTube 适配** | 验证海外视频 Feed 与播放器代理 | YouTube | 首页 Home Feed、封面、时长、观看量、原生播放器 Portal 与回退 |
| **2.7 社区与开放社交扩展** | 继续验证 `discussion` 与复杂 `post` 通用性 | Mastodon、Bluesky、Reddit 帖子详情 | 标签、回复、内容警告、可见范围、链接卡片与 Thread Detail |
| **2.8 内容订阅扩展** | 验证文章与开放订阅源 | RSS/Atom、Medium、Substack、WordPress | Feed 摘要与 Detail/RSS 全文独立解析；作者与来源、发布时间、已读/稍后读和重复文章处理 |

Phase 2 的正式 KPI 仍以至少 8 个稳定 Adapter 为准。微博、小红书、Hacker News 与 Reddit 列表 Feed 已完成首轮适配，剩余计划平台依次为哔哩哔哩、YouTube；其他平台按真实用户需求、目标站点政策和 Adapter 维护成本逐步进入正式支持，不以 Schema 理论覆盖数冒充已交付平台数。平台支持状态和适配进度以 README 为准。

建模依据包括 [ActivityStreams 2.0](https://www.w3.org/TR/activitystreams-core/)、[Mastodon Status](https://docs.joinmastodon.org/entities/Status/)、[Bluesky Posts](https://docs.bsky.app/docs/advanced-guides/posts)、[Reddit Post](https://developers.reddit.com/docs/api/redditapi/models/classes/Post)、[Hacker News API](https://github.com/HackerNews/API)、[LinkedIn Posts API](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api)、[YouTube Video](https://developers.google.com/youtube/v3/docs/videos)、[Twitch API](https://dev.twitch.tv/docs/api/reference/) 与 [Atom RFC 4287](https://www.rfc-editor.org/rfc/rfc4287)。

#### 3. 主题引擎 (Theme Engine & System Styles)
主题包必须分别声明支持的 Surface。Feed 主题负责卡片密度和预览截断；Article Detail 负责单篇正文排版；Thread Detail 负责固定主题头、回答/回复列表和分页。三者共享视觉 Token 和 Block Renderer，不要求使用相同顶层布局。

当前 Focus Paper 已支持浅色与深色两套外观，并通过独立的 `colorScheme` 本地偏好在受支持页面间同步。`theme` 继续表示主题包，明暗模式不占用主题标识，以免阻碍后续多主题扩展。

内置 6 款精心调优的高质感视觉主题：
* **Notion Style**：极简折叠、无框卡片、灰白克制留白；列表 Card 按标题、正文、元信息三行组织，作者只显示在第三行且不显示头像；单平台页面隐藏来源名称，独立“查看原文”操作由标题链接替代；短纯文本自动采用紧凑密度。
* **Apple Design Style**：毛玻璃（Backdrop Filter）、大圆角、流畅微交互。
* **Terminal / Hacker Style**：纯黑背景、等宽字体、绿/橙高亮、ASCII 分隔符。
* **Newspaper / Paper Style**：双列报纸排版、复古衬线体、纸质肌理背景。
* **Cyberpunk Style**：高饱和霓虹色调、科幻边框。
* **Minimal Clean**：极致文本流，去除一切视觉干扰。

#### 4. 架构优化与交互代理
* **SPA Surface 生命周期**：使用 WXT 路由事件按完整 URL 识别页面，依次销毁旧 Adapter/Store/Renderer、恢复原 DOM，再挂载新 Surface；hash-only 跳转不重建页面。Article/Thread Detail 只有在 URL 对应的目标节点解析成功后才遮罩原页，避免 DOM 延迟或规则失效造成空白详情。
* **原站频道代理**：Feed Adapter 从当前页面的原生导航容器动态发现频道名称、顺序与选中态，Renderer 只展示轻量描述；用户选择频道时回调原 DOM 控件，不复制站点 URL 清单或排序规则。站点在同一导航结构中增加频道后可自动进入 OneFeed，只有导航结构或 Feed 卡片结构变化时才需要更新 Adapter。
* **视频播放器节点搬运 (Portal)**：对于 B站/YouTube 视频，通过 DOM `appendChild` 将原平台的播放器节点无缝“移驾”到新 UI 卡片中，保留原生播放状态与清晰度选项。
* **统一触底加载 (Feed Loading)**：Feed Surface 接近底部时统一向 Adapter 请求下一批内容；Adapter 可驱动被隐藏的原页面滚动、点击同文档加载控件，或抓取并离线解析同源 HTML 下一页。文档分页使用单请求锁、稳定 ID 去重、失败重试和卸载终止，避免整页导航清空当前阅读进度。

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
| **Phase 1** | 已完成 | 建立核心架构基线，知乎/Twitter/V2EX/Linux DO 渲染成功率 > 95%，卡片解析延迟 < 100ms。 |
| **Phase 2** | M3 - M6 | 交付至少 8 个稳定 Adapter，Schema 可表达 20 余个主流产品的基础 Feed，内置 6 款主题，获得 10,000+ 活跃用户 (WAU)。 |
| **Phase 3** | M7 - M10 | 上线 AI 摘要与过滤功能，端到端解析修复成功率 > 90%，留存率 (D30) > 35%。 |
| **Phase 4** | M11 - M12 | 推出 Pro 订阅，转化率达到 3% - 5%，开放 Theme Marketplace 开发者社区。 |
