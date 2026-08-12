# 市场竞品分析

> 调研日期：2026 年 8 月 5 日
> 产品范围：OneFeed 当前产品与长期路线

## 1. 结论摘要

当前市场存在大量与本产品局部相似的产品，但尚未发现一个成熟产品同时完成以下四件事：

1. 读取用户在原网站登录后实际看到的个性化信息流；
2. 将不同平台的 DOM 内容归一化为统一数据结构；
3. 在原网页中隐藏原 UI，并用统一主题完整重绘信息流；
4. 在此基础上提供跨平台过滤、AI 处理、主题和 Adapter 生态。

现有产品主要分为四类：

- **统一信息流客户端**：聚合多个公开 Feed 或开放社交协议；
- **原站 UI 改造扩展**：重新设计单个平台，或者隐藏部分界面元素；
- **注意力与 AI 过滤工具**：移除推荐内容或按用户目标过滤 Feed；
- **阅读与主题生态工具**：提供沉浸式阅读、站点适配、自定义 CSS 或插件市场。

因此，本产品面对的不是空白市场，而是一个组合创新机会。差异化核心不应只是“统一阅读”或“Notion 风格”，而应是：

> 一个运行在原网站上的通用 Feed UI 层：保留平台内容和用户登录态，把知乎、X、Bilibili 等信息流转换成用户选择的界面、主题和过滤规则。

## 2. 竞品全景

| 产品 | 主要重合点 | 与本产品的关键差异 | 竞争关系 |
| :--- | :--- | :--- | :--- |
| [Tapestry](https://tapestry.iconfactory.com/) | 多来源统一时间线、Connector、过滤规则、去重和原平台 Action | 独立客户端，主要通过公开 Feed/API 获取数据，不在原网站内接管 UI | 长期路线中最接近 |
| [BewlyBewly](https://chromewebstore.google.com/detail/bewlybewly/bbbiejemhfihiooipfcjmjmbfdmobobp) | 浏览器扩展、重新设计 Bilibili 首页、保留原平台能力 | 仅面向 Bilibili，没有跨平台 Feed Schema 和主题生态 | 原站重绘技术形态最接近 |
| [简悦 SimpRead](https://simpread.pro/) | 站点适配、沉浸式重绘、插件中心、AI 阅读与知识库导出 | 核心对象是文章阅读和标注，而不是动态、无限加载的社交 Feed | 产品生态路线高度相似 |
| [SocialFocus](https://chromewebstore.google.com/detail/socialfocus-%E2%80%94-hide-feeds/abocjojdmemdpiffeadpdnicnlhcndcg) | 在多个社交网站中隐藏 Feed、Shorts、推荐和推广内容 | 主要删除或隐藏内容，不做归一化和完整重绘 | 用户需求的直接替代品 |
| [News Feed Eradicator](https://chromewebstore.google.com/detail/news-feed-eradicator/fjcldmjmjhkklehbacihaiopjklihlgg) | 跨平台移除社交 Feed，降低无意识浏览 | 用引言替换 Feed，不保留并重组内容 | 注意力管理替代品 |
| [Control Panel for Twitter](https://chromewebstore.google.com/detail/control-panel-for-twitter/kpmjjdhbcfebfjgdnpjagcndoelnidfj) | 深度调整 X 时间线、推荐、侧栏、排序和交互展示 | 单平台，以 DOM/CSS 调整为主 | X 平台专业竞品 |
| [Unhook](https://chromewebstore.google.com/detail/unhook-remove-youtube-rec/khncfooichmfjbepaaaebmommgaepoid) | 移除 YouTube 推荐、Shorts、评论、侧栏等干扰 | 单平台，只做界面减法 | YouTube 平台专业竞品 |
| [Atten](https://www.atten.page/) | 使用自然语言目标实时过滤 YouTube、X 和 Reddit 内容 | 保留原站 UI，不提供统一主题和完整重绘 | Phase 3 AI 过滤直接竞品 |
| [Stylebot](https://stylebot.dev/) | 修改任意网站外观、自定义 CSS、跨浏览器同步 | 不理解 Feed 语义，没有统一数据模型和交互代理 | 主题引擎替代品 |
| [Openvibe](https://openvibe.social/) | 将多个开放社交网络合并为统一时间线 | 主要依赖开放协议，不覆盖封闭平台登录态推荐流 | 内容入口层竞品 |
| [Surf](https://about.surf.social/) | 混合 Bluesky、Mastodon、Threads、YouTube、RSS 等来源创建自定义 Feed | 独立聚合体验，不在原站重绘 | 内容发现层竞品 |
| [Reeder](https://apps.apple.com/us/app/reeder/id6475002485) | 将 RSS、视频、播客和社交内容放入统一时间线 | Apple 平台独立客户端，不试图替代完整社交客户端 | 统一阅读体验竞品 |
| [Inoreader](https://www.inoreader.com/pricing/feature/auth_feeds) | RSS、网站监控、社交来源、规则和过滤 | 以订阅和监控为核心，不读取用户当前原站 Feed | 信息聚合替代品 |

## 3. 重点竞品分析

### 3.1 Tapestry：长期路线最接近

Tapestry 将 Bluesky、Mastodon、Tumblr、RSS、播客和 YouTube 等来源组合为统一的时间线，并支持第三方 Connector。其能力还包括：

- 跨 Feed 的 Muffle 与 Mute 规则；
- 时间线布局、字体和外观调整；
- 通过 Connector 执行点赞、转发和收藏等操作；
- 使用 Crosstalk 识别并弱化跨平台重复内容；
- 第三方 Connector 的安装与分发。

这些能力与长期路线中的 Adapter 生态、统一信息流、过滤、跨平台去重和交互代理高度接近。

主要区别在于 Tapestry 是独立客户端，并以公开 Feed、开放协议和 API 为主要数据源。本产品计划直接利用用户浏览器中的原平台登录态，在目标网站页面内完成提取和重绘，因此能够覆盖没有公开 Feed、API 受限或高度依赖推荐算法的平台。

### 3.2 BewlyBewly：原站重绘技术形态最接近

BewlyBewly 是重新设计 Bilibili 网站界面的浏览器扩展。它不是单纯修改颜色，而是重新组织首页结构、视觉表现和部分功能，同时继续使用 Bilibili 的内容与服务。

它验证了以下需求：

- 用户愿意安装扩展替换平台官方 UI；
- 单平台完整重绘可以形成明确的产品价值；
- 视觉体验和个性化本身可以成为安装理由；
- 浏览器扩展可以在保留原平台能力的同时提供另一套产品界面。

与本产品相比，BewlyBewly 仍是单平台方案，没有跨平台的 `FeedItem` 归一化模型、统一主题系统和 Adapter 市场。它可以视为单平台版本的技术与产品验证参照。

### 3.3 简悦：生态与工作流路线最接近

简悦围绕网页沉浸式阅读建立了站点适配、阅读模式、标注、插件中心、AI 阅读助手以及 Notion、Obsidian、Logseq 等导出工作流。其[插件中心](https://simpread.ksria.cn/plugins/)还包含知乎阅读增强、版面定制、关键词屏蔽、全文翻译和知识库导出等能力。

与本产品长期路线的重合点包括：

- Adapter 或站点适配规则；
- 原网页内容的沉浸式重新排版；
- 插件和开发者生态；
- AI 内容处理；
- 向个人知识库导出。

关键区别在于，简悦主要处理用户主动打开的文章和长内容，而本产品核心处理的是动态、连续、无限加载且具有强交互性的社交信息流。

### 3.4 多平台降噪扩展：最直接的需求竞品

SocialFocus、News Feed Eradicator、Control Panel for Twitter 和 Unhook 都通过浏览器扩展改变用户在原平台上的信息消费方式。

- SocialFocus 支持在 YouTube、Facebook、Instagram、X 和 Reddit 等站点隐藏 Feed、Shorts、推荐、趋势和推广内容；
- News Feed Eradicator 直接移除多个社交网站的 Feed，并用引言替代；
- Control Panel for Twitter 可以默认打开按时间排序的 Following 时间线，隐藏 For You、趋势、推荐和部分互动指标；
- Unhook 专注于移除 YouTube 首页推荐、Shorts、相关视频、评论和自动播放等干扰。

这些产品证明“用户希望降低平台噪音并重新控制注意力”是已经成立的需求。不过它们主要做界面减法，而本产品试图保留有价值内容，再重新组织其表现形式。

### 3.5 Atten：AI 过滤路线的早期直接竞品

Atten 允许用户用自然语言设置当前目标，例如“学习 React”或“准备面试”，然后实时评估 YouTube、X 和 Reddit 中的内容，隐藏与目标无关的项目。它结合快速规则、AI 评估和本地缓存。

这与长期路线中的 Attention Shield、语义过滤和信息密度控制高度重合。当前产品仍处于早期阶段，但说明“AI 过滤 Feed”本身不足以构成长期护城河。本产品需要将 AI 能力与跨平台归一化、完整重绘、用户自定义算法和本地隐私优势结合。

### 3.6 Stylebot 与用户样式生态：主题路线替代品

Stylebot 允许用户选择网页元素并修改颜色、字体、布局或隐藏内容，也可以直接编写自定义 CSS。Stylish/Userstyles 等产品进一步形成了用户创建和分发网站主题的生态。

它们与 Theme Engine 和 Theme Marketplace 存在重叠，但只操作视觉层：

- 不将站点内容转换为统一 Feed Schema；
- 不理解作者、正文、媒体和互动统计等语义；
- 不处理跨平台去重和排序；
- 不为点赞、评论和视频播放提供统一交互代理。

因此，主题不应只是 CSS 包，而应建立在稳定的归一化组件协议之上。这会成为本产品主题生态相对于用户样式工具的核心区别。

### 3.7 聚合阅读器与开放社交客户端：用户心智竞品

Openvibe、Surf、Reeder 和 Inoreader 都在解决“减少应用切换，在一个地方查看多种来源”的问题：

- Openvibe 合并 Mastodon、Bluesky、Nostr、Threads、Tumblr 和 RSS；
- Surf 允许混合开放社交网络、YouTube、RSS 和播客创建自定义 Feed；
- Reeder 将文章、视频、播客和社交内容整合为统一时间线；
- Inoreader 提供 RSS、无 RSS 网站监控、社交来源、搜索和规则过滤。

它们解决的是“去一个新客户端查看所有来源”，本产品解决的是“仍然访问原网站，但使用自己的界面、主题与算法阅读”。两者技术路径不同，但会争夺同一个用户心智，因此产品文案必须明确这种区别。

## 4. 竞争格局判断

### 4.1 当前平台扩张阶段

当前产品的直接竞争来自两侧：

- BewlyBewly 等产品证明完整重绘的体验价值；
- SocialFocus、Control Panel for Twitter 等产品用更低的技术成本满足“减少干扰”的核心需求。

因此，产品不能只依赖 Notion 风格的视觉差异，还应持续验证：

1. 无需平台开放 API，也能稳定读取用户实际看到的登录态 Feed；
2. 完整重绘后仍能可靠完成点赞、跳转、图片查看和无限加载；
3. 同一套 Feed 组件和主题能够同时在知乎与 X 上工作；
4. 重绘体验相对于简单隐藏或 CSS 修改具有明显用户价值。

### 4.2 长期阶段

长期竞争不是来自某一个完整对手，而是来自几类能力的组合：

```text
Tapestry 的统一时间线与 Connector 生态
        +
BewlyBewly 的原站完整重绘
        +
简悦的适配器、插件与知识库工作流
        +
Atten 的 AI 语义过滤
        +
Stylebot 的主题自定义与分发
```

如果任何现有产品横向扩展，都可能进入本产品路线。因此需要尽早形成以下积累：

- 可复用且可测试的跨平台 `FeedItem` Schema；
- Adapter 开发、更新与自愈机制；
- 与具体网站 DOM 解耦的 Theme API；
- 对原平台交互和媒体节点的稳定代理；
- 用户本地规则、偏好与跨平台语义数据。

## 5. 建议的产品定位

不建议仅使用“统一信息流阅读器”作为定位，因为用户容易将其理解为 RSS 阅读器或 Tapestry、Reeder 一类的独立聚合客户端。

建议使用以下方向之一：

### 方向 A：通用 Feed UI 层

> 保留你关注的内容，替换平台替你决定的界面。

强调原站运行、跨平台统一 UI、登录态内容和交互保留。

### 方向 B：Bring Your Own Interface

> 同一个互联网信息流，换成你选择的主题、密度和阅读规则。

强调 Theme Engine、用户控制和长期 Marketplace。

### 方向 C：个人信息流操作系统

> 将分散在不同平台的信息流，转换成可以过滤、去重、总结和积累的个人数据层。

强调 Phase 3 之后的 AI、知识库与 BYO-Algorithm 能力。

现阶段优先推荐方向 A，因为它最准确地表达了与 RSS 阅读器、换肤插件和 Feed 屏蔽工具之间的差异。

## 6. 主要风险

### 6.1 DOM 与维护风险

目标网站的 DOM、CSS 类名、懒加载机制和前端框架更新可能导致 Adapter 失效。跨平台数量增加后，维护成本会快速增长。

### 6.2 交互完整性风险

完全隐藏原 DOM 后，登录弹窗、评论面板、视频播放器、键盘导航、无障碍能力和埋点逻辑可能受到影响。简单的点击代理不足以覆盖所有交互。

### 6.3 平台政策风险

扩展权限、内容脚本注入、目标平台服务条款以及 Chrome Web Store 审核规则都可能影响分发和功能范围。新增站点和权限时需要逐项评估。

### 6.4 产品价值被低成本方案替代

如果用户只需要隐藏推荐、修改颜色或使用时间排序 Feed，那么 SocialFocus、Stylebot 或单平台扩展已经足够。完整重绘必须提供可感知的跨平台一致性、信息密度控制和更好的内容理解，才能抵消其复杂度。

### 6.5 AI 功能同质化

摘要、标题改写和语义过滤容易被独立扩展或平台自身快速复制。长期壁垒更可能来自高质量的归一化数据、用户规则、Adapter 生态和跨平台行为，而不是单个 AI 功能。

## 7. 后续调研建议

在当前平台扩张期间，建议持续跟踪以下信息：

- BewlyBewly 的重绘范围、用户反馈和站点更新后的修复速度；
- Tapestry 的 Connector SDK、第三方生态和跨平台动作支持；
- 简悦的适配规则分发、插件商业模式和知识库工作流；
- SocialFocus、Unhook 等扩展的安装规模与高频功能；
- Atten 等 AI Feed 过滤工具的留存、延迟、成本和隐私策略；
- Chrome Manifest V3 与目标平台对 DOM 注入、脚本隔离和权限的政策变化。

应用商店的用户量、评分、价格和功能会持续变化。涉及商业决策时，应重新核查各产品官网与应用商店，而不应将本文中的市场状态视为永久事实。
