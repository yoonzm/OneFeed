import { describe, expect, it } from 'vitest';
import {
  getPlatformForUrl,
  getSupportedPlatforms,
  PLATFORM_CATALOG,
} from './platforms';

describe('platform catalog', () => {
  it('keeps supported platforms in descending daily-active-user order', () => {
    expect(getSupportedPlatforms().map((platform) => platform.name)).toEqual([
      '微博',
      'X',
      '小红书',
      'Reddit',
      '知乎',
      'Hacker News',
      'Linux DO',
      'V2EX',
      '36Kr',
    ]);
    expect(getSupportedPlatforms().map((platform) => platform.navOrder)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9,
    ]);
  });

  it('uses unique ids and navigation positions', () => {
    expect(new Set(PLATFORM_CATALOG.map((platform) => platform.id)).size)
      .toBe(PLATFORM_CATALOG.length);
    expect(new Set(PLATFORM_CATALOG.map((platform) => platform.navOrder)).size)
      .toBe(PLATFORM_CATALOG.length);
  });

  it('recognizes catalog host aliases without matching lookalike domains', () => {
    expect(getPlatformForUrl('https://zhuanlan.zhihu.com/p/1')?.id).toBe('zhihu');
    expect(getPlatformForUrl('https://mobile.twitter.com/home')?.id).toBe('twitter');
    expect(getPlatformForUrl('https://www.v2ex.com/')?.id).toBe('v2ex');
    expect(getPlatformForUrl('https://linux.do/latest')?.id).toBe('linux-do');
    expect(getPlatformForUrl('https://www.weibo.com/hot/weibo/102803')?.id).toBe('weibo');
    expect(getPlatformForUrl('https://s.weibo.com/weibo?q=OneFeed')?.id).toBe('weibo');
    expect(getPlatformForUrl('https://www.xiaohongshu.com/explore')?.id).toBe('xiaohongshu');
    expect(getPlatformForUrl('https://news.ycombinator.com/newest')?.id).toBe('hacker-news');
    expect(getPlatformForUrl('https://36kr.com/information/web_news/')?.id).toBe('36kr');
    expect(getPlatformForUrl('https://www.reddit.com/r/typescript/')?.id).toBe('reddit');
    expect(getPlatformForUrl('https://www.bilibili.com/')).toBeUndefined();
    expect(getPlatformForUrl('https://www.youtube.com/')).toBeUndefined();
    expect(getPlatformForUrl('https://linux.do.example.com/')).toBeUndefined();
    expect(getPlatformForUrl('https://news.ycombinator.com.example.com/')).toBeUndefined();
    expect(getPlatformForUrl('not-a-url')).toBeUndefined();
  });
});
