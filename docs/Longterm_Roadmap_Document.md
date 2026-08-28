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
* **覆盖平台**：知乎、V2EX、Linux DO、Hacker News。
* **核心交付**：1 款 Notion 风格基础主题，打通 Feed Surface，并以知乎回答/专栏验证 Article Detail，以知乎问题、V2EX 主题和 Linux DO 话题验证 Thread Detail。
* **安全回退**：浏览器工具栏图标打开启动中心，启动中心总开关与页面右侧常驻悬浮开关共同切换全局接管状态。暂停后立即卸载接管层并恢复原页面，初始化异常时自动回退，用户可随时重新开启；该状态不会在 Chrome 中禁用扩展本身。
* **首次激活**：首次安装后自动打开扩展内欢迎页，通过安装成功反馈、产品愿景、可点击的平台目录、三步使用说明、核心能力和本地隐私承诺，引导用户前往无需登录的 Hacker News 立即体验。欢迎页只在首次安装时出现，扩展升级不主动打断用户。
* **日常启动**：独立启动中心承接工具栏入口，按“继续阅读、最近使用、更多网站”组织已支持平台，并提供全局状态、明暗外观、使用指南和反馈入口；最近使用只保存在本地。
* **交付顺序**：`0.1.0` 先交付知乎完整链路，后续迭代通过统一 Adapter 注册契约接入 V2EX、Linux DO 与 Hacker News，并将 V2EX、Linux DO 社区主题纳入 Thread Detail；前期只保留以文字阅读为主的平台，以降低动态 DOM、富媒体与复杂互动同时带来的维护成本。
* **工程基础**：使用 WXT 的文件式入口、Manifest 生成、开发加载和发布打包能力承载扩展工程，为后续按浏览器生成独立构建保留统一入口。
* **扩展边界**：Feed、Article Detail 与 Thread Detail 共享 Block、内容角色、作者、指标和操作描述，但使用独立顶层模型与 Renderer。新增路由通过完整 URL 注册到对应 Surface；未支持路由不得被域名级兜底接管。

---

### Phase 2: 渲染引擎强化与平台扩张 (当前阶段)

当前产品界面支持英文与简体中文，使用浏览器原生国际化机制自动跟随 Chrome 界面语言；英文作为其他未翻译语言的默认回退。OneFeed 自身生成的导航、状态、设置和 Adapter 通用操作文案必须使用语义化翻译 key，原站内容与动态频道名称保持原样。

#### 1. 目标平台扩展 (Platform Expansion)

平台覆盖分为三个层级：

* **Schema 可表达**：Feed 使用 `kind + role + previewBlocks + metrics + actions` 描述列表卡片；动态、文章与回答的单篇详情使用 `ArticleDetail.body`，问题/主题详情使用 `ThreadDetail.header + entries`，仍需单独开发 Adapter、解析测试和原站操作代理。
* **需要标准 Block 扩展**：仍属于通用 Feed，但必须先新增可复用 Block 或状态协议。
* **需要专用 Surface**：核心交互不是卡片式 Feed，不应为了扩大平台数量而强行塞入通用 Card。

##### Schema 可直接表达的平台

| 产品类型 | 可覆盖产品 | 主要映射 |
| :--- | :--- | :--- |
| 短动态与开放社交 | X、微博 | Feed 使用 `post` + `richText/gallery/video/linkPreview/quote/poll`；受支持的单条动态详情使用 `ArticleDetail.body` |
| 论坛与社区 | Reddit、V2EX、Linux DO/Discourse、Hacker News、知乎问题 | Feed 使用 `discussion`；详情使用 `ThreadDetail` 的 `topic/question -> reply/answer` 角色关系 |
| 长文内容 | 知乎专栏、36Kr 文章 | Feed 使用 `article + previewBlocks`；受支持详情使用 `ArticleDetail.body` |
| 图片 Feed | 微博、小红书、Reddit | `post/article` + `gallery/video`；只覆盖 Feed 卡片，不承诺完整播放器体验 |

以上平台“可覆盖”仅表示统一数据和 UI 协议足以表达其主要 Feed 内容，不表示已经完成目标站点适配，也不表示其所有操作都可以在 Shadow DOM 中可靠代理。

##### 需要新增标准 Block 的平台

| 标准扩展 | 代表产品 | 新增能力 |
| :--- | :--- | :--- |
| `live` | 直播信息流 | 直播中/预告/结束、实时观看人数、计划时间、直播间入口 |
| `audio` | 音频信息流 | 音频源、时长、节目/专辑、播放进度 |
| `document` | 文档与论坛附件 | 文件类型、页数、大小、预览与下载/原文回退 |
| `verticalVideo` 展示策略 | 竖屏视频信息流 | 竖屏比例、自动播放策略、上下切换和播放状态；底层仍复用 `video` 数据 |
| `product` | 商品笔记与商品卡片 | 商品、价格、商家、库存/时效提示和外部购买入口 |
| `reference` | 职位、活动与社区事件卡片 | 引用对象类型、状态、时间地点和主操作 |

##### 不纳入通用 Card 的产品

* Slack、Discord、Microsoft Teams：核心是频道、连续消息、会话线程和成员状态，应使用 Chat/Thread Surface。
* Gmail、Outlook：核心是邮件会话、收件人、附件和邮件状态，应使用 Mail Surface。
* 淘宝、Amazon 等交易首页：核心是价格、库存、规格、购物车和支付，不应由阅读型 Feed Schema 承担交易语义。

#### 2. Adapter 交付顺序

| 迭代 | 目标 | 平台交付 | 验收重点 |
| :--- | :--- | :--- | :--- |
| **基础能力（已完成）** | 完成 Schema、Surface 与 Renderer 解耦 | 知乎、V2EX、Linux DO、Hacker News | `FeedItem`/`ArticleDetail`/`ThreadDetail` 可序列化；URL 路由互斥；SPA 切换清理旧 Surface；Block Registry 与 Action Bar 跨 Surface 复用 |
| **2.1 综合资讯扩展（已完成）** | 验证多频道资讯列表、同文档增量加载与完整文章阅读 | 36Kr | 资讯频道、标题、摘要、封面、作者、主题、“查看更多”加载与文章详情正文 |
| **2.2 开放社交时间线（已完成）** | 验证动态 DOM、富媒体短动态与原站频道/互动代理 | X | 登录后的 `/home` 时间线、“为你推荐”与“正在关注”频道、文本、图片、视频封面、外链预览及互动统计；详情页和无可靠永久链接的推广卡片不接管 |
| **2.3 社交与图片 Feed（已完成）** | 验证现有列表协议的跨类型复用，并将单条动态与原站检索接入统一 Surface | 微博、小红书、Reddit | 微博热门首页、单条微博详情及内容检索，小红书发现页与频道，Reddit 首页/排序页/社区 Feed；文本、封面、作者、社区、推荐原因和互动统计；微博详情保留完整正文与主帖点赞代理，评论区、完整播放器及其余平台详情不接管 |

Phase 2 前期不以 Adapter 数量为 KPI，而以阅读链路的稳定性为先。当前正式支持微博热门首页、单条微博详情及内容检索，X 首页时间线，小红书发现页，Reddit 首页/排序页/社区 Feed，知乎、Hacker News、Linux DO、V2EX，以及 36Kr 资讯频道及文章详情。Schema 理论上能够表达某类内容，不代表已经交付对应平台适配；平台支持状态以 README 为准。

建模依据包括 [ActivityStreams 2.0](https://www.w3.org/TR/activitystreams-core/)、[Reddit Post](https://developers.reddit.com/docs/api/redditapi/models/classes/Post)、[Hacker News API](https://github.com/HackerNews/API) 与 [Atom RFC 4287](https://www.rfc-editor.org/rfc/rfc4287)。

#### 3. 主题引擎 (Theme Engine & System Styles)
主题包必须分别声明支持的 Surface。Feed 主题负责卡片密度和预览截断；Article Detail 负责单篇正文排版；Thread Detail 负责固定主题头、回答/回复列表和分页。三者共享视觉 Token 和 Block Renderer，不要求使用相同顶层布局。

当前 Focus Paper 已支持浅色与深色两套外观，并通过独立的 `colorScheme` 本地偏好在受支持页面间同步。用户从 Feed 点击进入条目详情时，会按平台与条目 ID 在本地记录“已看过”状态；该状态独立于 Adapter 内容协议，后续筛选规则可直接消费。`theme` 继续表示主题包，明暗模式不占用主题标识，以免阻碍后续多主题扩展。

Thread Detail 按内容角色决定阅读层级，而不是强制所有平台采用相同交互。知乎问题顶部的问题说明默认显示两行并允许原地展开，回答列表只显示两行摘要，点击“查看详情”进入独立 Article Detail；V2EX、Linux DO 等论坛的 `reply` 没有独立详情页，短回复直接完整显示，长回复在当前讨论串内展开。回答与回复可以复用作者、Block 和操作栏等视觉组件，但不共享详情导航策略。

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
* **文章评论代理**：Article Detail 的评论采用“静态能力描述 + 按需评论快照”，Adapter 负责驱动原站局部评论、全部评论/回复弹层与增量加载，Renderer 点击评论后统一打开 OneFeed 弹窗；点击评论回复数时在评论弹窗上方打开独立回复弹窗，关闭后保留底层评论数据和滚动位置。Renderer 不在文章底部插入评论，也不直接渲染平台 DOM。
* **原站检索代理**：Renderer 只展示能力驱动的统一检索入口，查询、排序和持续加载仍由原站完成；微博与知乎内容检索路由接管为 Feed Surface，只解析可归一化为 `FeedItem` 且具有有效原文链接的结果，不对本地 Store 做伪搜索。微博仅接管 `s.weibo.com/weibo` 内容结果，用户、话题等其他检索路由保留原站。
* **视频播放器节点搬运 (Portal)**：对于原站视频，通过 DOM `appendChild` 将播放器节点无缝“移驾”到新 UI 卡片中，保留原生播放状态与清晰度选项。
* **统一触底加载 (Feed Loading)**：Feed Surface 接近底部时统一向 Adapter 请求下一批内容；Adapter 可驱动被隐藏的原页面滚动、点击同文档加载控件，或抓取并离线解析同源 HTML 下一页。文档分页使用单请求锁、稳定 ID 去重、失败重试和卸载终止，避免整页导航清空当前阅读进度。

#### 5. 确定性展示过滤（已完成）
* **本地规则设置**：扩展设置页支持展示过滤总开关、隐藏已读内容、隐藏带明确推荐原因的内容，以及按关键词、作者、平台和内容类型创建自定义规则；同一规则内条件为 AND，多条规则之间为 OR。
* **统一数据层执行**：Adapter 继续只描述原始内容，Renderer 在完整 `FeedItem` Store 上派生可见条目，命中项不会从 Store 删除，以保留去重、更新、无限加载和原站操作代理能力。
* **可解释反馈**：Feed 显示隐藏数量，并允许临时查看命中内容及规则原因；当前批次全部命中时停止自动补载，由用户选择继续加载或检查规则，避免空白页面和无限请求。
* **能力边界**：字段缺失时不命中；频道 ID、互动量和发布时间暂不用于持久规则，避免原站 DOM 变化或跨平台指标语义不一致造成误过滤。语义黑白名单仍属于 Phase 3 的 AI 能力。

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
| **Phase 1** | 已完成 | 建立核心架构基线，知乎/V2EX/Linux DO/Hacker News 渲染成功率 > 95%，卡片解析延迟 < 100ms。 |
| **Phase 2** | M3 - M6 | 优先扩展近乎纯文字的信息源并稳定阅读链路，Schema 可表达 20 余个主流产品的基础 Feed，内置 6 款主题，获得 10,000+ 活跃用户 (WAU)。 |
| **Phase 3** | M7 - M10 | 上线 AI 摘要与过滤功能，端到端解析修复成功率 > 90%，留存率 (D30) > 35%。 |
| **Phase 4** | M11 - M12 | 推出 Pro 订阅，转化率达到 3% - 5%，开放 Theme Marketplace 开发者社区。 |
