# 原站检索功能设计

## 1. 目标

在 OneFeed 渲染层提供统一检索入口，但检索本身必须由当前平台执行。首个适配平台为知乎：用户在 OneFeed 页头输入关键词后，进入知乎原生内容检索路由；知乎负责查询、排序和持续加载，OneFeed 只解析并展示原站返回的内容结果。

这项能力不是对 `useFeedStore` 中已加载条目的本地过滤，也不把 OneFeed 的展示过滤规则转换成站点查询条件。

## 2. 首期范围

- 在知乎 Feed Surface 的平台栏中提供检索入口。
- 提交到知乎 `/search?type=content&q=...` 原生路由。
- 将带有效关键词的知乎内容结果页识别为 Feed Surface。
- 复用知乎原站的首屏结果、无限加载和内容操作控件。
- 在搜索结果页保留当前关键词，便于直接修改后再次检索。
- 中文、英文界面均提供完整的标签、占位提示和关闭文案。

### 首期不做

- 在本地条目 Store 中查找或过滤。
- 接管知乎“用户、论文、专栏、电子书、圈子、话题、视频、想法”等其他结果分类。
- 在 OneFeed 中复刻知乎的高级筛选、搜索建议和历史记录。
- 合并不同平台的搜索结果。
- 在 Article Detail 或 Thread Detail 中展示检索入口。

## 3. 核心决策

### 3.1 Renderer 只消费能力，不判断平台

`BaseAdapter` 提供两个默认关闭的方法：

```ts
getInitialSearchQuery(): string | undefined;
triggerSearch(query: string): boolean;
```

`undefined` 表示当前 Feed Adapter 没有原站检索能力；空字符串表示支持检索但当前不是结果页。`FeedApp -> OneFeedShell -> PlatformBar` 只接收初始关键词和提交回调，不包含 `platform === 'zhihu'` 分支。

### 3.2 查询必须离开当前本地快照

知乎 Adapter 对输入做首尾空白清理后构造新的站内 URL：

```text
https://www.zhihu.com/search?type=content&q=<encoded query>
```

提交使用页面导航，让知乎自己的页面应用发起查询。OneFeed 不调用未公开 API，不抓取搜索接口，也不把当前已加载 Feed 作为候选结果。

### 3.3 搜索结果仍由统一 Feed Renderer 展示

Registry 仅在以下条件同时满足时接管知乎搜索页：

- 路径为 `/search`；
- `type=content`；
- `q` 包含非空关键词。

结果由知乎写入原页面 DOM，Adapter 的 MutationObserver 和触底加载继续消费这些节点。Renderer 不感知查询请求、结果排序或分页协议。

### 3.4 混合实体按可表达能力收敛

知乎“内容”检索仍可能混入热词、书籍等卡片。首期只解析拥有知乎问题、回答或专栏原文链接，并且能够归一化为 `FeedItem` 的结果。其他实体保持在隐藏原页中，不猜测标题、作者或详情 URL，也不生成指向搜索页本身的伪条目。

## 4. 交互设计

- 默认平台栏保持现状，只增加一个 32px 检索图标按钮。
- 打开检索时，平台导航原位转换为单行“平台 · 检索”输入带；品牌、主题和辅助入口仍保持位置，避免新增弹层或挤压正文。
- 搜索结果页默认展开输入带并回填 URL 中的 `q`。
- `Enter` 提交；`Escape` 或关闭按钮退出编辑，并恢复结果页当前关键词。
- 输入为空时不提交，不提供本地搜索回退。
- 窄屏下隐藏文字型范围标签，保留可访问名称和完整焦点样式。

## 5. 状态流

```text
PlatformBar 提交关键词
        |
        v
FeedApp 回调当前 Feed Adapter
        |
        v
ZhihuAdapter 构造原站 content 搜索 URL
        |
        v
知乎页面应用加载 /search 结果
        |
        v
Content Script 按新 URL 重建 Zhihu Feed Adapter
        |
        +-- 从 URL 回填 q
        +-- 解析具有原文链接的 ContentItem
        +-- 原站触底后继续追加 DOM
        |
        v
统一 Feed Renderer 展示结果
```

## 6. 验收标准

- 知乎首页、关注、推荐和热榜均显示检索入口；其他平台不显示无效入口。
- 提交关键词后，URL 使用知乎原生 `type=content` 检索路由，查询值正确编码。
- 搜索结果页继续显示 OneFeed Feed Surface，并回填当前关键词。
- 结果内容来自知乎页面 DOM；本地 Store 中的旧 Feed 条目不会参与匹配。
- 没有有效原文链接的混合实体不会生成卡片。
- 触底仍由原站加载，稳定 ID 去重和原站操作代理不回归。
- 输入、提交、关闭和 `Escape` 均可由键盘操作，并有可见焦点。
- `npm run compile`、`npm test`、`npm run lint` 与 `git diff --check` 全部通过。

