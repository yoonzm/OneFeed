# Chrome Web Store 发布与自动化指南

> 更新日期：2026 年 8 月 10 日
> 适用项目：OneFeed

## 1. 结论

OneFeed 已具备 Manifest V3、WXT 生产构建与 ZIP、测试和 Lint 命令，可以直接生成 Chrome Web Store 上传包。产品面向多平台信息流，当前版本申请知乎、Twitter/X、V2EX 与 Linux DO 站点权限并支持四类信息流。

首次发布仍建议在 Chrome Web Store Developer Dashboard 中手动完成，因为首次上架需要注册开发者、填写商店资料、完成隐私声明并创建扩展条目。取得 `EXTENSION_ID` 后，后续版本可以通过 GitHub Actions 自动构建、上传并提交审核。

仓库使用 Google 官方认证 Action 获取短期凭据，并由仓库内脚本直接调用官方 Chrome Web Store API v2，不依赖第三方商店发布 Action。

## 2. 当前仓库的发布准备情况

### 2.1 已具备

- Manifest V3 配置；
- WXT + React 生产构建；
- `npm run zip` 商店打包命令；
- `npm run build` 构建命令；
- `npm test` 自动化测试；
- `npm run lint` 静态检查；
- 最小化的 `storage` 权限；
- 仅针对知乎、Twitter/X、V2EX 与 Linux DO 域名的 Content Script 匹配范围。

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

OneFeed 当前版本会读取并解析用户访问的知乎、Twitter/X、V2EX 与 Linux DO 页面内容。即使内容仅在本地处理、没有上传服务器，Chrome Web Store 仍将网站内容读取和本地处理视为用户数据处理，因此需要如实披露。未来增加其他平台时，应同步更新权限、商店披露和隐私政策。

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
5. 在知乎信息流验证点赞/评论代理；在知乎问题页验证问题头、回答折叠、触底加载和赞同代理；在回答详情与专栏文章详情页验证正文、图片和“查看原页面”；在 V2EX 主题页验证主题头、真实楼层号和分页。

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

### 4.1 Service Account 与 Workload Identity Federation

Chrome Web Store API v2 支持 Service Account，适合 CI/CD：

1. 在 Google Cloud 项目中创建 Service Account；
2. 启用 Chrome Web Store API、IAM API、Cloud Resource Manager API、IAM Service Account Credentials API 和 Security Token Service API；
3. 在 Chrome Web Store Developer Dashboard 的 Account 设置中添加 Service Account 邮箱；
4. 创建信任 GitHub Actions 的 Workload Identity Pool 与 OIDC Provider；
5. 将 OIDC Provider 限制到 `yoonzm/OneFeed` 仓库的 `master` 分支和 `v*` Tag；
6. 授予该 GitHub 身份对 Service Account 的 `roles/iam.workloadIdentityUser`；
7. GitHub Actions 通过 OIDC 换取带有 Chrome Web Store Scope 的短期 Access Token。

OIDC Provider 使用以下约束：

```text
Issuer: https://token.actions.githubusercontent.com

Attribute mapping:
google.subject=assertion.sub
attribute.repository=assertion.repository
attribute.repository_owner=assertion.repository_owner
attribute.ref=assertion.ref

Attribute condition:
assertion.repository_owner == 'yoonzm'
```

授予 Service Account 访问权时，Principal 应限制为该仓库：

```text
principalSet://iam.googleapis.com/projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/POOL_ID/attribute.repository/yoonzm/OneFeed
```

Provider 条件先限制 GitHub 仓库所有者；Service Account 的 Principal 再通过 `attribute.repository` 限制到 `yoonzm/OneFeed`。GitHub Environment 的 Deployment branches 负责限制 `master` 与 `v*` Tag。

Service Account 与 Workload Identity Federation 能避免将个人 OAuth Refresh Token 或长期 JSON Key 放在 CI 中。当前一个 Publisher 只能添加一个 Service Account。

参考：

- [Chrome Web Store API Service Account](https://developer.chrome.com/docs/webstore/service-accounts)
- [Google Cloud Workload Identity Federation](https://cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines)

### 4.2 OAuth 备用方式

如果无法使用 Workload Identity Federation，可以创建 OAuth Client，通过 OAuth Playground 获取包含以下 Scope 的 Refresh Token：

```text
https://www.googleapis.com/auth/chromewebstore
```

OAuth Client ID、Client Secret 和 Refresh Token 必须存放在 GitHub Environment Secrets 中。该方式包含长期凭据，只作为兼容性备用方案。

参考：[Chrome Web Store API 使用指南](https://developer.chrome.com/docs/webstore/using-api)

## 5. GitHub Actions 自动发布

### 5.1 推荐的触发方式

仓库使用两条工作流：

- `.github/workflows/ci.yml`：每次 Pull Request 和推送 `master` 时运行 Lint、类型检查、测试和构建；
- `.github/workflows/publish-chrome.yml`：`master` 中的 `package.json` 发生变化、推送 `v*` Tag 或手动触发时执行发布；每 6 小时还会检查一次是否有因商店正在审核而暂缓的更新。

发布版本以 `package.json` 中的 `version` 为准。代码准备发布时，必须在同一个提交中递增该版本。普通代码提交不会重复打扰商店审核队列。

### 5.2 发布流程

发布工作流使用固定 Commit SHA 的 `actions/checkout`、`actions/setup-node` 和 `google-github-actions/auth`，然后调用仓库内的 `scripts/publish-chrome.mjs`。不使用第三方 Chrome Web Store 发布 Action。

工作流需要以下最小权限：

```yaml
permissions:
  contents: read
  id-token: write
```

发布 Job 使用 `chrome-web-store` Environment，并通过官方 `google-github-actions/auth` 获取短期 Access Token：

```yaml
- id: google-auth
  uses: google-github-actions/auth@7c6bc770dae815cd3e89ee6cdf493a5fab2cc093 # v3
  with:
    token_format: access_token
    workload_identity_provider: ${{ vars.GCP_WIF_PROVIDER }}
    service_account: ${{ vars.GCP_SERVICE_ACCOUNT }}
    access_token_scopes: https://www.googleapis.com/auth/chromewebstore
```

如果希望完全自动发布，不要为该 Environment 配置 Required reviewers；应使用 Deployment branches 限制只允许 `master` 和 `v*` Tag。若启用 Required reviewers，发布 Job 会等待人工批准。

### 5.3 GitHub Environment Variables

进入 GitHub Repository → Settings → Environments，新建 `chrome-web-store`，然后配置：

| 名称 | 类型 | 内容 |
| :--- | :--- | :--- |
| `CWS_PUBLISHER_ID` | Variable | Developer Dashboard Account 页面中的 Publisher ID |
| `CWS_EXTENSION_ID` | Variable | 首次创建商店条目后获得的 32 位扩展 ID |
| `GCP_WIF_PROVIDER` | Variable | `projects/.../locations/global/workloadIdentityPools/.../providers/...` |
| `GCP_SERVICE_ACCOUNT` | Variable | 被添加到 Developer Dashboard 的 Service Account 邮箱 |

这些标识不属于密码。使用推荐的 WIF 方式时，不需要 GitHub Actions Secret。

## 6. 直接调用官方 API v2

仓库中的 `scripts/publish-chrome.mjs` 直接调用官方 API v2。主要端点为：

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

脚本会比较 `.output/chrome-mv3/manifest.json` 与商店现有版本。如果商店状态为 `PENDING_REVIEW` 或 `STAGED`，不会自动取消现有提交，而是暂缓本次发布；定时工作流会继续重试 `master` 上的最新版本。上传请求返回 `IN_PROGRESS` 时，脚本最多轮询两分钟。

送审请求使用 `DEFAULT_PUBLISH` 和 `blockOnWarnings: true`。审核通过后立即按 Developer Dashboard 中已有的可见性发布；存在 API 校验警告时流水线失败。官方 API 不会自动修改商店页面、隐私声明或发布范围。如果手动改变了可见性，需要先使用新可见性手动发布一次，之后 API 才能继续按该设置发布。

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
  → 推送 master 或创建同版本 v* Tag
  → GitHub Action 自动运行
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

- [ ] 知乎信息流、问题/回答/专栏详情和 V2EX 主题详情能够正常解析；
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
- [ ] Workload Identity Federation 仅信任 `yoonzm/OneFeed`；
- [ ] `chrome-web-store` Environment Variables 已配置；
- [ ] 正式发布使用受保护的 GitHub Environment；
- [ ] GitHub Actions 均固定到已审查的 Commit SHA；
- [ ] 首次自动化发布先使用 Trusted Testers 验证。
