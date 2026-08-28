# OneFeed Privacy Policy

Effective date: August 26, 2026

OneFeed is a browser extension that rearranges feeds from supported websites into a unified reading interface. This policy explains how version `0.1.14` processes data. The current version supports Weibo, X, Xiaohongshu, Reddit, Zhihu, Hacker News, Linux DO, V2EX, and 36Kr. This policy and the relevant permission disclosures will be updated when support for additional websites is released.

## Data processed

To create the unified feed and supported comment-reading interface, the extension reads content already displayed on the current supported page. This may include titles, body text, comments, replies, publicly visible author information, images, interaction counts, publication times, and content links.

The extension also uses `chrome.storage.local` to store the enabled state, theme preferences, recently used platforms, display-filter rules, and local identifiers for feed items the user has opened.

## How the data is used

Page content is used only to:

- create the unified reading interface on the current page;
- display comments and replies for supported article pages;
- support image previews and links or delegated interactions with the original page;
- deduplicate feed items on the same page locally;
- mark feed items that the user has opened;
- filter displayed content locally according to the user's read-state, keyword, author, platform, and content-type rules.

## Data transfer and sharing

The current version does not send page content, browsing history, or extension settings to a developer server or third party. It does not sell user data or use it for advertising, credit assessment, or purposes unrelated to the extension's core functionality.

All page parsing, content sanitization, and interface rendering happen locally in the user's browser.

## Storage and deletion

OneFeed does not maintain a cloud user database. The enabled state, theme preferences, recently used platforms, display-filter rules, and opened-item identifiers are stored in the browser's local extension storage. Users can remove this data by uninstalling the extension or clearing its data from Chrome's extension management page.

## Permissions

- **storage:** Saves the enabled state, theme preferences, recently used platforms, display-filter rules, and opened-item identifiers locally.
- **Weibo site access:** Reads and rearranges supported Weibo trending feeds, individual post pages, and content-search results opened by the user.
- **X site access:** Reads and rearranges the supported X home timeline and its feed channels opened by the user.
- **Xiaohongshu site access:** Reads and rearranges supported Xiaohongshu Explore feeds, content channels, and note pages opened by the user.
- **Reddit site access:** Reads and rearranges supported Reddit home, sorted, and community feeds opened by the user.
- **Zhihu site access:** Reads and rearranges supported Zhihu feeds, questions, answers, answer comments and replies, and article pages opened by the user.
- **Hacker News site access:** Reads and rearranges public news, Ask, Show, and Jobs lists opened by the user, and loads public pagination locally.
- **Linux DO site access:** Reads and rearranges supported Linux DO topic lists and topic reply pages opened by the user.
- **V2EX site access:** Reads and rearranges supported V2EX topic lists and topic reply pages opened by the user.
- **36Kr site access:** Reads and rearranges supported 36Kr feeds and article pages opened by the user.

The extension does not run outside these supported websites.

## Policy changes

If a future version introduces cloud synchronization, AI analysis, or another feature that transfers data, this policy will be updated before that feature is released, with clear disclosure and user choice where required.

## Contact

For questions about this policy or OneFeed's data handling, contact the developer through GitHub Issues:

https://github.com/yoonzm/OneFeed/issues
