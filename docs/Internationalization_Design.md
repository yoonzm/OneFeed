# OneFeed 国际化设计

## 目标

OneFeed 首期支持英文与简体中文。界面自动跟随 Chrome 的界面语言，不提供扩展内语言切换器；简体中文用户使用 `zh_CN`，其他未提供翻译的语言回退到英文。

## 技术方案

- 使用 `@wxt-dev/i18n` 和浏览器原生 `i18n` 能力。
- 默认语言为 `en`，翻译源文件位于 `src/locales/`。
- Manifest 名称、描述和工具栏提示使用 `__MSG_*__` 占位符。
- React、Background 和 Content Script 统一通过 `#i18n` 读取同步翻译。
- OneFeed 生成的日期和数字按 Chrome 界面语言格式化。
- 扩展页面的 `lang`、标题和描述在入口启动时同步更新；Shadow DOM 宿主使用相同界面语言。

## 文案边界

需要翻译的内容包括 OneFeed 的导航、按钮、状态、错误、设置项、无障碍标签，以及 Adapter 主动生成的通用操作名称。

原网站文章、评论、作者、标签和动态发现的频道名称保持原样。Adapter 数据模型使用 `kind`、`role`、`entryKind` 等语义字段，不得再用中文展示文案承担类型判别职责。

## 新增语言

1. 复制 `src/locales/en.json` 并使用 Chrome 支持的 locale 名称创建文件。
2. 保持所有翻译 key 与英文文件一致。
3. 检查替换参数、英文式复数结构和无障碍标签。
4. 在目标语言的 Chrome 环境中检查启动中心、欢迎页、设置页、阅读器和悬浮开关。
5. 同步增加商店文案和面向用户的隐私政策翻译。

## 验收

- `npm run compile`、`npm test`、`npm run lint` 和 `npm run build` 全部通过。
- 构建产物包含 `en` 与 `zh_CN` 的 `_locales` 文件，Manifest 默认语言为英文。
- 单元测试检查两种语言的 key 完全一致，以及英文替换参数和复数形式。
- 原站内容不因 OneFeed 的界面语言发生改变。
