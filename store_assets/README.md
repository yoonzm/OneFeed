# Chrome Web Store 素材清单

## 可直接上传

| 文件 | 用途 | 尺寸 |
| :--- | :--- | :--- |
| `store_icon_128.png` | 商店图标 | 128×128 PNG |
| `screenshot_1280x800.png` | 商店功能截图 | 1280×800 PNG |
| `promo_440x280.png` | Small promo tile | 440×280 PNG |
| `store_listing_zh-CN.md` | 商店文案、权限说明、测试说明 | Markdown |

`screenshot_1280x800.png` 使用与扩展 Focus Paper 界面一致的脱敏示例内容，不包含真实用户数据。

## 源文件

| 文件 | 用途 |
| :--- | :--- |
| `logo.png` | 方形 Logo 源图（766×766 PNG） |
| `logo_full.png` | 带 OneFeed 字标的横版 Logo |
| `screenshot-demo.html` | 可重复生成商店截图的静态演示页 |
| `promo-demo.html` | 可重复生成宣传图的静态演示页 |

## 相关文件

- 隐私政策：`docs/Privacy_Policy.md`
- Chrome Web Store 上传包：`.output/onefeed-<version>-chrome.zip`

在填写商店隐私政策 URL 前，需要先将 `docs/Privacy_Policy.md` 推送到公开 GitHub 仓库，确认以下地址可以在未登录状态访问：

https://github.com/yoonzm/OneFeed/blob/master/docs/Privacy_Policy.md
