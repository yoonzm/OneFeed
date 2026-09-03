# OneFeed Store Listing (English)

## Basic information

- **Name:** OneFeed
- **Short description:** Rearrange supported website feeds into one focused, consistent reading interface that you can pause at any time.
- **Recommended category:** Productivity
- **Language:** English
- **Version:** 0.1.18

## Detailed description

OneFeed turns feeds from supported websites into a clean and consistent Focus Paper reading interface. It reduces page noise while keeping the original content, scrolling behavior, and essential interactions available.

The current version supports feeds and selected detail pages from Weibo, X, Xiaohongshu, Reddit, Zhihu, Hacker News, Linux DO, V2EX, and 36Kr.

Current features include:

- a first-install welcome page with a public Hacker News page for immediate testing;
- a launch center for recently used platforms, supported websites, global state, settings, and appearance;
- unified feed, article, question, answer, topic, comment, and reply reading where supported, including individual Weibo posts and Xiaohongshu notes;
- sorting loaded feed content by publication time, likes, comments, or bookmarks, with the choice saved per platform;
- local read markers and display filters for read state, keywords, authors, platforms, and content types;
- settings for header website visibility and order, plus feed and detail image display;
- compact image previews, light and dark appearances, and continued feed loading;
- delegated original-site interactions with an explicit return-to-source fallback;
- a floating switch and launch-center switch that restore the original page immediately;
- English and Simplified Chinese interfaces that follow Chrome's display language;
- page parsing and rendering performed locally in the browser.

OneFeed is an independently developed third-party extension and is not affiliated with, authorized by, or endorsed by Weibo, X, Xiaohongshu, Reddit, Zhihu, Hacker News, Linux DO, V2EX, 36Kr, or their affiliates.

## Single-purpose statement

Read feeds from supported websites that the user currently has open and rearrange them locally into a low-distraction, unified reading interface.

## Permission disclosure

### storage

Stores the enabled state, theme preferences, header website visibility and order, feed and detail image preferences, per-platform feed sorting choices, recently used platforms, display-filter rules, and opened-item identifiers locally on the user's device.

### Supported website access

Access to `weibo.com`, `x.com`, `twitter.com`, `xiaohongshu.com`, `reddit.com`, `zhihu.com`, `news.ycombinator.com`, `linux.do`, `v2ex.com`, and `36kr.com` is used only to read supported pages opened by the user, create the unified reading interface, and delegate interactions explicitly triggered by the user. The extension does not run outside supported websites.

## Data disclosure

- **Data type processed:** Website content.
- **Processing:** Local browser processing only.
- **Data transfer:** Not sent to a developer server or third party.
- **Advertising:** None.
- **Data sale:** None.

Final selections should match the fields shown in the Chrome Web Store Privacy page at submission time and remain consistent with `docs/Privacy_Policy_en.md`.

## Links

- **Homepage:** https://onefeed.fyi/
- **Support:** https://github.com/yoonzm/OneFeed/issues
- **Privacy policy:** https://onefeed.fyi/privacy/
