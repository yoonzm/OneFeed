# OneFeed 官网设计与发布说明

## 网站目标

`onefeed.fyi` 是 OneFeed 的产品说明与自然搜索入口。首页只承担一个主要任务：让需要减少信息流噪音的 Chrome 用户理解 OneFeed 的工作方式，并前往安装或关注发布。

网站只描述当前已经交付的能力。平台支持范围、隐私承诺和功能边界应继续以 `README.md`、`README.en.md` 与两份隐私政策为准；这些内容变化时，应同步检查官网文案。

## 信息架构

- `/`：简体中文产品首页；
- `/en/`：英文产品首页；
- `/privacy/`：简体中文隐私政策；
- `/en/privacy/`：英文隐私政策；
- `/robots.txt` 与 `/sitemap.xml`：搜索引擎发现入口。

首页包含产品定位、交互式界面对比、支持平台、当前能力、本地隐私、三步使用说明、常见问题和最终行动入口。中英文页面使用独立 URL，并通过 `hreflang` 互相声明。

## 视觉方向

网站延续扩展的 Focus Paper 主题，把页面视为一张正在被重新排版的阅读页：纸白背景、墨黑正文、OneFeed 蓝作为唯一主操作色，平台原色只用于标识内容来源。展示标题使用宋体/衬线字体栈，正文使用仓库已有的 Geist Variable 与中文系统黑体，状态标签使用等宽字体。

首页的标志性元素是“原网站 / OneFeed”交互式阅读流。它用同一批脱敏示例内容展示从平台噪音到统一阅读排版的变化，而不是依赖抽象插图或无法验证的效果数字。

## 构建与 Cloudflare Pages

运行：

```bash
npm run build:site
```

构建脚本将静态源码、产品图标、平台图标、社交分享图和自托管字体汇总到 `dist-site/`。Cloudflare Pages 推荐配置：

- Build command：`npm run build:site`
- Build output directory：`dist-site`
- Node.js version：`22`

中英文首页的主要行动入口指向 OneFeed 的正式 Chrome Web Store 详情页：

https://chromewebstore.google.com/detail/onefeed-%E2%80%94-one-way-to-read/phndibmgpccnhkpmcpijjfbllgadiabd

GitHub 项目页与 Issues 继续作为源码说明和反馈入口。
