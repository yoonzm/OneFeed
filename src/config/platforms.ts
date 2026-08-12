import type { FeedSource } from '../types/feed';

export type PlatformStatus = 'supported' | 'adapting' | 'testing' | 'planned';

export interface PlatformDefinition extends FeedSource {
  status: PlatformStatus;
  navOrder: number;
  plannedOrder?: number;
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
  status: 'planned',
  navOrder: 5,
  plannedOrder: 1,
  hosts: ['weibo.com'],
} as const satisfies PlatformDefinition;

export const XIAOHONGSHU_PLATFORM = {
  id: 'xiaohongshu',
  name: '小红书',
  homeUrl: 'https://www.xiaohongshu.com/',
  status: 'planned',
  navOrder: 6,
  plannedOrder: 2,
  hosts: ['xiaohongshu.com'],
} as const satisfies PlatformDefinition;

export const BILIBILI_PLATFORM = {
  id: 'bilibili',
  name: '哔哩哔哩',
  homeUrl: 'https://www.bilibili.com/',
  status: 'planned',
  navOrder: 7,
  plannedOrder: 3,
  hosts: ['bilibili.com'],
} as const satisfies PlatformDefinition;

/** 页面导航、Popup 和适配器共享此目录，避免平台状态与入口地址分别维护。 */
export const PLATFORM_CATALOG = [
  ZHIHU_PLATFORM,
  TWITTER_PLATFORM,
  V2EX_PLATFORM,
  LINUX_DO_PLATFORM,
  WEIBO_PLATFORM,
  XIAOHONGSHU_PLATFORM,
  BILIBILI_PLATFORM,
] as const satisfies readonly PlatformDefinition[];

export type PlatformId = (typeof PLATFORM_CATALOG)[number]['id'];

export function getSupportedPlatforms(): PlatformDefinition[] {
  return PLATFORM_CATALOG.filter((platform) => platform.status === 'supported');
}

export function getPlannedPlatforms(): PlatformDefinition[] {
  return PLATFORM_CATALOG.filter((platform) => platform.status !== 'supported');
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
