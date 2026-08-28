# OneFeed

English | [简体中文](README.md)

> Turn scattered feeds into a reading space that belongs to you.

OneFeed is a browser extension for web feeds. It creates one calm, consistent, and controllable reading experience across otherwise disconnected platforms. The content remains on the original websites, while you decide how it is presented and filtered.

## Why OneFeed

Platforms usually control interface density, recommendation logic, and how attention is distributed. Moving between websites means repeatedly adapting to different product decisions.

OneFeed adds a personal interface between you and those platforms. It is designed for reading and understanding rather than maximizing time spent on a page.

## What it supports

- **Supported now:** the Weibo trending home feed, post pages, and content search, the X home timeline, Xiaohongshu Explore, Reddit home/sorted/community feeds, Zhihu, Hacker News, Linux DO, V2EX, and 36Kr news feeds and article pages.
- **Display filters:** Hide read content, platform recommendations, keywords, authors, platforms, and content types. All rules run locally.
- **Original-site search:** Search Weibo and Zhihu through their native content search and continue reading supported results in OneFeed.
- **Appearance:** Focus Paper with light and dark modes.
- **Languages:** English and Simplified Chinese. The interface follows Chrome's display language, with English as the fallback for other languages.

OneFeed is still at an early stage. Stable reading flows take priority over broad but shallow platform coverage.

The X adapter covers the signed-in `/home` timeline, including the For You and Following tabs, post text, images, video posters, link previews, and interaction counts. Post detail pages and promoted cards without a reliable permalink remain on the original X interface.

The Weibo adapter covers the trending home feed, canonical `/<uid>/<mid>` post pages, and content results on `s.weibo.com/weibo`. Post pages render the complete text, images, video posters, and interaction counts, while likes are delegated to the current native post control; comments and full players remain on the original interface. Xiaohongshu covers `/explore` and its content channels, and Reddit covers home, sorted, and community feeds. Their detail pages, promoted cards, and interactions that cannot be delegated reliably remain on the original interfaces.

See the [long-term roadmap](docs/Longterm_Roadmap_Document.md) for the broader product direction and the [privacy policy](docs/Privacy_Policy_en.md) for details about local data processing.
