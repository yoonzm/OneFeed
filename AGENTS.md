# 仓库指南

## 项目结构与模块组织

本仓库是基于 WXT、React 和 TypeScript 的 Chrome Manifest V3 扩展。`README.md` 维护平台支持状态与适配顺序，`docs/Longterm_Roadmap_Document.md` 描述后续的平台、主题、AI 与生态阶段。产品决策应记录在 `docs/` 中；当平台范围或交付顺序变化时，应同步更新 README 与长期路线图。

WXT 入口位于 `src/entrypoints/`：`background.ts` 是 Service Worker，`content.tsx` 声明站点匹配并启动接管逻辑，`popup/` 是弹窗页面。内容脚本实现和站点适配器位于 `src/content/`，React 渲染逻辑位于 `src/renderer/`，共享模型位于 `src/types/`。静态扩展资源位于 `public/`，测试与被测代码相邻存放。

## 构建、测试与开发命令

项目需要 Node.js 22 或更高版本。可用命令包括：

- `npm run dev`：启动 WXT 开发模式并加载 Chrome 扩展。
- `npm run build`：生成 `.output/chrome-mv3/` 生产构建。
- `npm run zip`：生成可上传商店的 Chrome ZIP。
- `npm run compile`：运行 TypeScript 类型检查。
- `npm test`：运行自动化测试套件。
- `npm run lint`：检查 TypeScript 与 React 代码。

仅修改文档时，应检查 Markdown 渲染效果，并在提交前运行 `git diff --check`。

## 编码风格与命名约定

遵循现有 TypeScript 代码风格：使用两个空格缩进、分号、单引号，并为共享数据定义明确的接口。React 组件、类和类型使用 `PascalCase`，例如 `FeedItem`、`ZhihuAdapter`；函数和变量使用 `camelCase`。适配器文件按平台命名，如 `zhihu.ts`、`twitter.ts`，并将 DOM 选择器限制在对应适配器内。中英文文档统一保持 UTF-8 编码。

## 代码注释规范

核心模块、复杂逻辑、关键 DOM 假设及不直观的实现必须添加简洁注释，重点说明设计意图、约束和原因，避免逐行复述代码。修改实现时应同步更新或删除相关注释，确保注释始终准确。

## 测试规范

项目使用 Vitest 和 jsdom，但未设置覆盖率门槛。新增实现时，应为信息流归一化、去重和适配器解析编写针对性单元测试，并为 Shadow DOM 挂载及无限信息流更新添加浏览器级测试。测试文件统一命名为 `*.test.ts` 或 `*.test.tsx`。DOM 测试夹具应具有代表性，且不得包含真实用户数据。

## 提交与拉取请求规范

提交主题应简短、使用祈使语气，并可包含作用域，例如 `docs: clarify adapter contract`。每个提交只处理一个明确主题。拉取请求应说明用户可见影响、列出验证结果、关联相关 Issue 或设计章节，并为界面变更附上截图或录屏。若新增 `manifest.json` 权限或依赖目标站点的 DOM 假设，必须明确说明。
