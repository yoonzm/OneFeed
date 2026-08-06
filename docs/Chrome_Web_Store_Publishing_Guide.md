# Chrome Web Store 发布与自动化指南

> 更新日期：2026 年 8 月 6 日
> 适用项目：OneFeed

## 1. 结论

OneFeed 已具备 Manifest V3、WXT 生产构建与 ZIP、测试和 Lint 命令，可以直接生成 Chrome Web Store 上传包。产品面向多平台信息流，当前版本申请知乎与 Twitter/X 站点权限并支持两类信息流。

首次发布仍建议在 Chrome Web Store Developer Dashboard 中手动完成，因为首次上架需要注册开发者、填写商店资料、完成隐私声明并创建扩展条目。取得 `EXTENSION_ID` 后，后续版本可以通过 GitHub Actions 自动构建、上传并提交审核。

Google 提供官方 Chrome Web Store API v2，但目前没有 Google 官方维护的一键发布 GitHub Action。可以选择：

- 直接在 GitHub Actions 中调用官方 API v2，获得更好的长期可控性；
- 使用第三方 Action 快速完成 OAuth Token 刷新、上传和提交审核。

## 2. 当前仓库的发布准备情况

### 2.1 已具备

- Manifest V3 配置；
- WXT + React 生产构建；
- `npm run zip` 商店打包命令；
- `npm run build` 构建命令；
- `npm test` 自动化测试；
- `npm run lint` 静态检查；
- 最小化的 `storage` 权限；
- 仅针对知乎与 Twitter/X 域名的 Content Script 匹配范围。

### 2.2 发布前仍需补齐

#### 扩展图标

项目已提供 PNG 格式的 `16×16`、`32×32`、`48×48` 和 `128×128` 图标，并在 `wxt.config.ts` 中声明：

```typescript
icons: {
  16: 'icons/icon-16.png',
  32: 'icons/icon-32.png',
  48: 'icons/icon-48.png',
  128: 'icons/icon-128.png',
},
action: {
  default_icon: {
    16: 'icons/icon-16.png',
    32: 'icons/icon-32.png',
  },
  default_title: 'OneFeed',
},
```

Popup 的 `default_popup` 由 WXT 根据 `src/entrypoints/popup/index.html` 自动生成。

Chrome Web Store 使用 `128×128` 图标展示安装信息和商店条目，`48×48` 用于扩展管理页面，`16×16` 和 `32×32` 用于工具栏及其他小尺寸场景。SVG 不能用于 Manifest 中声明的扩展图标。

参考：[Chrome 扩展图标说明](https://developer.chrome.com/docs/extensions/reference/manifest/icons)

#### 商店图片

至少准备：

- 一张 `128×128` 商店图标；
- 一张实际产品截图，推荐 `1280×800`，也可以使用 `640×400`；
- 一张 `440×280` 小型宣传图；
- 可选的 `1400×560` Marquee 宣传图。

截图应展示真实的产品功能，但应使用测试账号或脱敏数据，不能暴露真实用户的头像、用户名、私密推荐内容或其他个人信息。

参考：[Chrome Web Store 图片要求](https://developer.chrome.com/docs/webstore/images)

#### 商店文案与支持信息

需要准备：

- 简短描述；
- 详细功能介绍；
- 单一用途说明；
- 权限用途说明；
- Homepage URL；
- Support URL 或支持邮箱；
- 测试说明；
- 产品与知乎、X 等平台不存在官方隶属或授权关系的声明。

商店文案需要明确说明扩展会读取页面内容并将信息流重新排版，避免功能描述与实际行为不一致。

参考：[商店信息填写说明](https://developer.chrome.com/docs/webstore/cws-dashboard-listing)

#### 隐私政策与数据披露

OneFeed 当前版本会读取并解析用户访问的知乎页面内容。即使内容仅在本地处理、没有上传服务器，Chrome Web Store 仍将网站内容读取和本地处理视为用户数据处理，因此需要如实披露。未来增加其他平台时，应同步更新权限、商店披露和隐私政策。

隐私政策至少应说明：

- 读取哪些网站内容；
- 数据仅用于在本地生成统一信息流；
- 当前是否向开发者服务器或第三方发送数据；
- `chrome.storage.local` 保存哪些设置；
- 数据保留和删除方式；
- 联系开发者的方式；
- 未来引入 AI 云端处理后，将如何重新取得用户知情同意。

如果当前版本完全本地运行，应避免含糊地声明“不处理任何数据”，而应准确说明“读取并在本地处理网页内容，但不收集或传输给开发者”。

参考：

- [Chrome Web Store 用户数据政策 FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq)
- [披露要求](https://developer.chrome.com/docs/webstore/program-policies/disclosure-requirements)
- [Limited Use 政策](https://developer.chrome.com/docs/webstore/program-policies/limited-use)

## 3. 首次手动发布

### 3.1 注册开发者账号

访问 [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)，使用计划长期持有的 Google 账号注册开发者并支付一次性注册费。

发布或更新扩展前，Google 账号必须启用两步验证。开发者账号邮箱创建后不能直接修改，因此建议使用专门且会持续维护的发布邮箱。

参考：

- [注册 Chrome Web Store 开发者账号](https://developer.chrome.com/docs/webstore/register/)
- [两步验证要求](https://developer.chrome.com/docs/webstore/program-policies/two-step-verification)

### 3.2 本地验证

在仓库根目录运行：

```powershell
npm ci
npm run lint
npm test
npm run build
```

然后打开 Chrome：

1. 进入 `chrome://extensions`；
2. 打开“开发者模式”；
3. 选择“加载已解压的扩展程序”；
4. 选择项目的 `.output/chrome-mv3/` 目录；
5. 在知乎信息流页面验证启用、关闭、重新开启、滚动、图片和原站交互。

### 3.3 打包 ZIP

在 PowerShell 中运行：

```powershell
npm run zip
```

WXT 会生成 `.output/onefeed-0.1.0-chrome.zip`，ZIP 根目录直接包含 `manifest.json`。

参考：[扩展发布准备说明](https://developer.chrome.com/docs/webstore/prepare)

### 3.4 创建商店条目

在 Developer Dashboard 中：

1. 点击 **Add new item**；
2. 上传 `onefeed-0.1.0.zip`；
3. 填写 Store listing；
4. 填写 Privacy；
5. 设置 Distribution；
6. 提供 Test instructions；
7. 提交审核。

首版建议先使用 Unlisted 或 Trusted Testers，完成真实安装验证后再公开发布。

参考：[Chrome Web Store 发布流程](https://developer.chrome.com/docs/webstore/publish/)

### 3.5 审核

GitHub Actions 只能自动上传和送审，不能跳过 Chrome Web Store 审核。审核可能由自动系统完成，也可能进入人工审核。权限、页面内容读取、远程代码、数据披露或功能说明不清楚都可能延长审核时间。

截至 2026 年，Chrome Web Store 官方提示提交量较高，审核时间可能延长。

参考：[Chrome Web Store 审核流程](https://developer.chrome.com/docs/webstore/review-process)

## 4. 配置 Chrome Web Store API

首次创建商店条目并取得扩展 ID 后，可以配置自动发布。

### 4.1 OAuth 方式

1. 在 Google Cloud Console 创建或选择项目；
2. 启用 **Chrome Web Store API**；
3. 配置 OAuth consent screen；
4. 创建 Web application 类型的 OAuth Client；
5. 将 `https://developers.google.com/oauthplayground` 添加为 Redirect URI；
6. 在 OAuth Playground 使用以下 Scope 授权：

```text
https://www.googleapis.com/auth/chromewebstore
```

7. 换取 Refresh Token；
8. 将 Client ID、Client Secret 和 Refresh Token 保存为 GitHub Actions Secrets。

参考：[Chrome Web Store API 使用指南](https://developer.chrome.com/docs/webstore/using-api)

### 4.2 Service Account 方式

Chrome Web Store API v2 支持 Service Account，适合 CI/CD：

1. 在 Google Cloud 项目中创建 Service Account；
2. 启用 Chrome Web Store API；
3. 在 Chrome Web Store Developer Dashboard 的 Account 设置中添加 Service Account 邮箱；
4. 通过短期 Token、Workload Identity Federation 或 Service Account Key 获取 Access Token；
5. 使用 Token 调用 API v2。

Service Account 能避免将个人 OAuth Refresh Token 长期放在 CI 中。当前一个 Publisher 只能添加一个 Service Account。

参考：[Chrome Web Store API Service Account](https://developer.chrome.com/docs/webstore/service-accounts)

## 5. GitHub Actions 自动发布

### 5.1 推荐的触发方式

首期建议使用 `workflow_dispatch` 手动触发，而不是每次推送 `main` 都自动提交商店审核。稳定后可以改为推送 `v*` Git Tag 时发布。

### 5.2 使用第三方 Action

[`puzzlers-labs/chrome-webstore-publish`](https://github.com/puzzlers-labs/chrome-webstore-publish) 可以自动刷新 OAuth Token、上传 ZIP 并向 Chrome Web Store 提交发布请求。

在 `.github/workflows/publish-chrome.yml` 中添加：

```yaml
name: Publish Chrome Extension

on:
  workflow_dispatch:

permissions:
  contents: read

jobs:
  publish:
    runs-on: ubuntu-latest
    environment: chrome-web-store

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Verify
        run: |
          npm run lint
          npm test
          npm run compile

      - name: Package
        run: npm run zip

      - name: Upload and submit
        uses: puzzlers-labs/chrome-webstore-publish@v1
        with:
          mode: publish
          extension_id: ${{ vars.CHROME_EXTENSION_ID }}
          zip_file_path: ./.output/onefeed-0.1.0-chrome.zip
          client_id: ${{ secrets.GOOGLE_CLIENT_ID }}
          client_secret: ${{ secrets.GOOGLE_CLIENT_SECRET }}
          refresh_token: ${{ secrets.GOOGLE_REFRESH_TOKEN }}
          publish_target: testers
```

`publish_target: testers` 适合首次自动化验证。准备公开发布后再改为 `public`。

该 Action 不是 Google 或 GitHub 官方 Action。生产使用时应检查其源代码，并将 `@v1` 固定到经过审查的完整 Commit SHA，避免上游 Tag 被替换后改变执行内容。

### 5.3 GitHub Variables 与 Secrets

进入 GitHub Repository → Settings → Secrets and variables → Actions，配置：

| 名称 | 类型 | 内容 |
| :--- | :--- | :--- |
| `CHROME_EXTENSION_ID` | Variable | 首次创建商店条目后获得的 32 位扩展 ID |
| `GOOGLE_CLIENT_ID` | Secret | Google Cloud OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | Secret | OAuth Client Secret |
| `GOOGLE_REFRESH_TOKEN` | Secret | 拥有 Chrome Web Store Scope 的 Refresh Token |

建议创建名为 `chrome-web-store` 的 GitHub Environment，并为正式发布配置人工审批规则。

## 6. 直接调用官方 API v2

如果不希望依赖第三方 Action，可以在 Workflow 中直接调用官方 API。主要端点为：

```text
POST /upload/v2/publishers/{publisherId}/items/{extensionId}:upload
GET  /v2/publishers/{publisherId}/items/{extensionId}:fetchStatus
POST /v2/publishers/{publisherId}/items/{extensionId}:publish
```

标准流程为：

```text
构建与测试
  → 打包 ZIP
  → 获取短期 Access Token
  → upload
  → 若返回 IN_PROGRESS，则轮询 fetchStatus
  → 状态变为 SUCCEEDED
  → publish
  → 等待商店审核
```

官方 API 不会自动修改商店页面、隐私声明或发布范围。使用 API 前仍需在 Dashboard 中完成这些配置。如果手动改变了可见性，需要先使用新可见性手动发布一次，之后 API 才能继续按该设置发布。

参考：[Chrome Web Store API v2](https://developer.chrome.com/docs/webstore/api/reference/rest)

## 7. 版本管理

每次上传的新版本都必须高于商店中的现有版本，否则上传会失败。

当前版本只在 `package.json` 中声明，WXT 构建时自动写入生成的 Manifest。发布 `0.1.1` 时修改：

```json
{
  "version": "0.1.1"
}
```

推荐发布流程：

```text
更新版本号
  → 更新变更说明
  → 本地测试
  → 提交代码
  → 创建 Git Tag
  → 运行 GitHub Action
  → 上传并送审
```

## 8. 发布检查清单

### 代码与构建

- [ ] `npm ci` 成功；
- [ ] `npm run lint` 通过；
- [ ] `npm test` 通过；
- [ ] `npm run compile` 通过；
- [ ] `npm run build` 通过；
- [ ] `npm run zip` 生成 `.output/onefeed-<version>-chrome.zip`；
- [ ] ZIP 根目录包含 `manifest.json`；
- [ ] Manifest 版本高于商店版本；
- [ ] 没有下载或执行远程 JavaScript；
- [ ] 只申请当前功能必要的最小权限。

### 功能验证

- [ ] 知乎信息流能够正常解析；
- [ ] 统一信息流能够主动关闭；
- [ ] 关闭后原页面立即恢复；
- [ ] 可以从 Popup 重新开启；
- [ ] 刷新页面后保留开关状态；
- [ ] 解析或挂载异常不会遮挡原页面；
- [ ] 点赞、评论跳转和图片查看符合商店描述。

### 商店资料

- [ ] 提供 Manifest 图标；
- [ ] 提供至少一张合规截图；
- [ ] 提供 `440×280` 宣传图；
- [ ] 提供详细描述与单一用途说明；
- [ ] 提供权限用途说明；
- [ ] 发布可公开访问的隐私政策；
- [ ] 完成 Privacy、Distribution 和 Test instructions；
- [ ] 确认截图中没有真实用户数据；
- [ ] 明确产品与目标平台不存在官方隶属关系。

### 自动化

- [ ] 商店中已创建初始条目；
- [ ] 已取得 `EXTENSION_ID`；
- [ ] 已启用 Chrome Web Store API；
- [ ] GitHub Secrets 与 Variables 已配置；
- [ ] 正式发布使用受保护的 GitHub Environment；
- [ ] 第三方 Action 固定到已审查的 Commit SHA；
- [ ] 首次自动化发布先使用 Trusted Testers 验证。
