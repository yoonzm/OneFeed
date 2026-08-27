import type { FeedSource } from '../types/feed';
import { i18n } from '../i18n';

export type PlatformStatus = 'supported' | 'adapting' | 'testing' | 'planned';

export interface PlatformDefinition extends FeedSource {
  status: PlatformStatus;
  navOrder: number;
  hosts: readonly string[];
}

export const ZHIHU_PLATFORM = {
  id: 'zhihu',
  name: '知乎',
  homeUrl: 'https://www.zhihu.com/',
  status: 'supported',
  navOrder: 1,
  hosts: ['zhihu.com'],
} as const satisfies PlatformDefinition;

export const TWITTER_PLATFORM = {
  id: 'twitter',
  name: 'X',
  homeUrl: 'https://x.com/home',
  status: 'supported',
  navOrder: 2,
  hosts: ['x.com', 'twitter.com'],
} as const satisfies PlatformDefinition;

export const V2EX_PLATFORM = {
  id: 'v2ex',
  name: 'V2EX',
  homeUrl: 'https://www.v2ex.com/',
  status: 'supported',
  navOrder: 3,
  hosts: ['v2ex.com'],
} as const satisfies PlatformDefinition;

export const LINUX_DO_PLATFORM = {
  id: 'linux-do',
  name: 'Linux DO',
  homeUrl: 'https://linux.do/',
  status: 'supported',
  navOrder: 4,
  hosts: ['linux.do'],
} as const satisfies PlatformDefinition;

export const WEIBO_PLATFORM = {
  id: 'weibo',
  name: '微博',
  homeUrl: 'https://weibo.com/',
  status: 'supported',
  navOrder: 5,
  hosts: ['weibo.com'],
} as const satisfies PlatformDefinition;

export const XIAOHONGSHU_PLATFORM = {
  id: 'xiaohongshu',
  name: '小红书',
  homeUrl: 'https://www.xiaohongshu.com/',
  status: 'supported',
  navOrder: 6,
  hosts: ['xiaohongshu.com'],
} as const satisfies PlatformDefinition;

export const HACKER_NEWS_PLATFORM = {
  id: 'hacker-news',
  name: 'Hacker News',
  homeUrl: 'https://news.ycombinator.com/',
  status: 'supported',
  navOrder: 7,
  hosts: ['news.ycombinator.com'],
} as const satisfies PlatformDefinition;

export const THIRTY_SIX_KR_PLATFORM = {
  id: '36kr',
  name: '36Kr',
  homeUrl: 'https://36kr.com/information/web_news/',
  status: 'supported',
  navOrder: 8,
  hosts: ['36kr.com'],
} as const satisfies PlatformDefinition;

export const REDDIT_PLATFORM = {
  id: 'reddit',
  name: 'Reddit',
  homeUrl: 'https://www.reddit.com/',
  status: 'supported',
  navOrder: 9,
  hosts: ['reddit.com', 'redd.it'],
} as const satisfies PlatformDefinition;

/** 页面导航和适配器共享此目录，避免平台状态与入口地址分别维护。 */
export const PLATFORM_CATALOG = [
  ZHIHU_PLATFORM,
  TWITTER_PLATFORM,
  V2EX_PLATFORM,
  LINUX_DO_PLATFORM,
  WEIBO_PLATFORM,
  XIAOHONGSHU_PLATFORM,
  HACKER_NEWS_PLATFORM,
  THIRTY_SIX_KR_PLATFORM,
  REDDIT_PLATFORM,
] as const satisfies readonly PlatformDefinition[];

export type PlatformId = (typeof PLATFORM_CATALOG)[number]['id'];

const PLATFORM_NAME_KEYS = {
  zhihu: 'platform.zhihu.name',
  twitter: 'platform.twitter.name',
  v2ex: 'platform.v2ex.name',
  'linux-do': 'platform.linuxDo.name',
  weibo: 'platform.weibo.name',
  xiaohongshu: 'platform.xiaohongshu.name',
  'hacker-news': 'platform.hackerNews.name',
  '36kr': 'platform.thirtySixKr.name',
  reddit: 'platform.reddit.name',
} as const satisfies Record<PlatformId, string>;

export function getPlatformDisplayName(id: PlatformId): string {
  return i18n.t(PLATFORM_NAME_KEYS[id]);
}

export function getSupportedPlatforms(): PlatformDefinition[] {
  return PLATFORM_CATALOG.filter((platform) => platform.status === 'supported');
}

export function getPlatformById(id: string): PlatformDefinition | undefined {
  return PLATFORM_CATALOG.find((platform) => platform.id === id);
}

export function getPlatformForUrl(value: string | URL): PlatformDefinition | undefined {
  let url: URL;
  try {
    url = typeof value === 'string' ? new URL(value) : value;
  } catch {
    return undefined;
  }

  return PLATFORM_CATALOG.find((platform) => platform.hosts.some((host) => (
    url.hostname === host || url.hostname.endsWith(`.${host}`)
  )));
}
