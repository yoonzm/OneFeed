# OneFeed Store Listing (English)

## Basic information

- **Name:** OneFeed
- **Short description:** Rearrange supported website feeds into one focused, consistent reading interface that you can pause at any time.
- **Recommended category:** Productivity
- **Language:** English
- **Version:** 0.1.12

## Detailed description

OneFeed turns feeds from supported websites into a clean and consistent Focus Paper reading interface. It reduces page noise while keeping the original content, scrolling behavior, and essential interactions available.

The current version supports feeds from Zhihu, X, V2EX, Linux DO, Weibo, Xiaohongshu, Hacker News, 36Kr, and Reddit.

Current features include:

- a first-install welcome page with a public Hacker News page for immediate testing;
- a launch center for recently used platforms, supported websites, global state, settings, and appearance;
- unified feed, article, question, answer, topic, comment, and reply reading where supported;
- local read markers and display filters for read state, keywords, authors, platforms, and content types;
- compact image previews, light and dark appearances, and continued feed loading;
- delegated original-site interactions with an explicit return-to-source fallback;
- a floating switch and launch-center switch that restore the original page immediately;
- English and Simplified Chinese interfaces that follow Chrome's display language;
- page parsing and rendering performed locally in the browser.

OneFeed is an independently developed third-party extension and is not affiliated with, authorized by, or endorsed by Zhihu, X, V2EX, Linux DO, Weibo, Xiaohongshu, Hacker News, 36Kr, Reddit, or their affiliates.

## Single-purpose statement

Read feeds from supported websites that the user currently has open and rearrange them locally into a low-distraction, unified reading interface.

## Permission disclosure

### storage

Stores the enabled state, theme preferences, recently used platforms, display-filter rules, and opened-item identifiers locally on the user's device.

### Supported website access

Access to `zhihu.com`, `x.com`, `twitter.com`, `v2ex.com`, `linux.do`, `weibo.com`, `xiaohongshu.com`, `news.ycombinator.com`, `36kr.com`, and `reddit.com` is used only to read supported pages opened by the user, create the unified reading interface, and delegate interactions explicitly triggered by the user. The extension does not run outside supported websites.

## Data disclosure

- **Data type processed:** Website content.
- **Processing:** Local browser processing only.
- **Data transfer:** Not sent to a developer server or third party.
- **Advertising:** None.
- **Data sale:** None.

Final selections should match the fields shown in the Chrome Web Store Privacy page at submission time and remain consistent with `docs/Privacy_Policy_en.md`.

## Links

- **Homepage:** https://github.com/yoonzm/OneFeed
- **Support:** https://github.com/yoonzm/OneFeed/issues
- **Privacy policy:** https://github.com/yoonzm/OneFeed/blob/master/docs/Privacy_Policy_en.md
