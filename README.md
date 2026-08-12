# OneFeed

> 把所有信息流网站，统一成一种你喜欢的阅读体验。

OneFeed 是一个面向 Web 信息流的浏览器扩展项目。它希望将不同平台的内容从原有界面中提取出来，转换为统一的数据结构，再以简洁、一致、可定制的方式重新呈现。

## 产品目标

今天的信息流体验由平台决定：界面风格、内容密度、推荐逻辑与注意力分配彼此割裂。OneFeed 希望在保留原平台内容与基础交互能力的同时，将阅读体验的控制权交还给用户。

项目已经完成核心架构验证，并在多个平台投入实际适配，当前具备以下基础能力：

- 从网页 DOM 中稳定提取信息流卡片和受支持详情正文；
- 将不同平台的数据归一化为统一模型；
- 通过 Shadow DOM 隔离并重新渲染界面；
- 提供一套极简、低干扰的 Notion 风格主题。

## 平台支持与适配进度

“已支持”仅表示表格中列出的页面已完成 Adapter、统一渲染和基础交互验证，不代表接管该网站的所有页面。新增或调整平台适配时，应同步更新本节。

### 已支持

| 平台 | 已支持范围 | 适配进度 |
| :--- | :--- | :--- |
| 知乎 | 首页、关注、热榜与推荐信息流；问题详情、回答详情与专栏文章 | ✅ 已支持 |
| Twitter/X | Home Feed | ✅ 已支持 |
| V2EX | 首页与最近主题列表；主题详情与分页回复 | ✅ 已支持 |
| Linux DO | 首页、最新、热门、分类与标签话题列表；话题详情 | ✅ 已支持 |

### 待支持

| 顺序 | 平台 | 计划适配范围 | 适配进度 |
| :---: | :--- | :--- | :--- |
| 1 | 微博 | 基础信息流、图文、视频、引用与互动数据 | ⬜ 待适配 |
| 2 | 小红书 | 基础笔记 Feed、多图与视频；商品内容先提供安全降级 | ⬜ 待适配 |
| 3 | 哔哩哔哩 | 首页与动态 Feed、视频卡片；播放器能力分阶段接入 | ⬜ 待适配 |

## 长期愿景

OneFeed 的长期愿景是成为跨平台信息流的通用浏览器入口与 AI 内容操作系统，让用户拥有三种关键能力：

- **视觉表达权**：自由选择主题、布局与信息密度；
- **内容筛选权**：跨平台降噪、去重、摘要并弱化标题党；
- **信息控制权**：将有价值的内容沉淀到 Notion、Obsidian 等个人知识系统。

未来项目将逐步扩展更多平台，引入主题生态、AI 辅助解析与个性化过滤，并探索开放的 Theme SDK 与开发者生态。

## 本地开发

需要 Node.js 22 或更高版本：

```bash
npm install
npm run dev
npm run build
npm run zip
npm run compile
npm test
npm run lint
```

`npm run dev` 会通过 WXT 启动并自动加载开发版扩展。生产构建输出到 `.output/chrome-mv3/`，商店 ZIP 输出到 `.output/onefeed-<version>-chrome.zip`。手动验证时，可在 Chrome 的 `chrome://extensions` 中开启开发者模式，选择“加载已解压的扩展程序”，然后选择 `.output/chrome-mv3/`。打开知乎首页、X Home Feed、V2EX 首页或 Linux DO 话题列表后，扩展会将信息流替换为 Focus Paper 阅读界面；知乎问题、V2EX 主题与 Linux DO 话题使用 Thread Detail，知乎独立回答与专栏文章使用 Article Detail。使用页面右侧悬浮开关或扩展 Popup 可随时恢复原始页面。

## 技术状态

当前版本基于 WXT、React 和 TypeScript，实现了 Feed、Article Detail 与 Thread Detail 三类 Surface，以及归一化去重、Shadow DOM 隔离渲染、图片预览、原站点赞代理和启用状态持久化。三类 Surface 通过共享 Block、内容角色和 Action 协议复用内容积木；SPA 路由变化时会清理旧 Surface 并重新识别页面。产品规划与市场分析请参阅：

- [长期产品路线图](docs/Longterm_Roadmap_Document.md)
- [市场竞品分析](docs/Competitor_Analysis_Document.md)
