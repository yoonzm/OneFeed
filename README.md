# OneFeed

> 把所有信息流网站，统一成一种你喜欢的阅读体验。

OneFeed 是一个面向 Web 信息流的浏览器扩展项目。它希望将不同平台的内容从原有界面中提取出来，转换为统一的数据结构，再以简洁、一致、可定制的方式重新呈现。

## 产品目标

今天的信息流体验由平台决定：界面风格、内容密度、推荐逻辑与注意力分配彼此割裂。OneFeed 希望在保留原平台内容与基础交互能力的同时，将阅读体验的控制权交还给用户。

首个 MVP 分阶段交付，并已覆盖知乎、Twitter/X、V2EX 与 Linux DO，验证以下核心路径：

- 从网页 DOM 中稳定提取信息流卡片和受支持详情正文；
- 将不同平台的数据归一化为统一模型；
- 通过 Shadow DOM 隔离并重新渲染界面；
- 提供一套极简、低干扰的 Notion 风格主题。

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

`npm run dev` 会通过 WXT 启动并自动加载开发版扩展。生产构建输出到 `.output/chrome-mv3/`，商店 ZIP 输出到 `.output/onefeed-<version>-chrome.zip`。手动验证时，可在 Chrome 的 `chrome://extensions` 中开启开发者模式，选择“加载已解压的扩展程序”，然后选择 `.output/chrome-mv3/`。打开知乎首页、X Home Feed、V2EX 首页或 Linux DO 话题列表后，扩展会将信息流替换为 Focus Paper 阅读界面；知乎回答详情与专栏文章详情使用独立的详情阅读界面。点击扩展图标可随时恢复原始页面。

## 当前状态

当前版本基于 WXT、React 和 TypeScript，实现了知乎、Twitter/X、V2EX 与 Linux DO 信息流解析、知乎详情解析、归一化去重、Shadow DOM 隔离渲染、图片预览、Feed 原站点赞/评论代理、知乎详情赞同代理和启用状态持久化。Feed 与 Detail 使用独立模型、Store、Adapter 和 Renderer，并通过共享 Block 协议复用内容积木；SPA 路由变化时会清理旧 Surface 并重新识别页面。详细方案请参阅：

- [MVP 设计文档](docs/MVP_Design_Document.md)
- [长期产品路线图](docs/Longterm_Roadmap_Document.md)
