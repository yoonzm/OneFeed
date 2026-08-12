import { describe, expect, it } from 'vitest';
import {
  getPlannedPlatforms,
  getPlatformForUrl,
  getSupportedPlatforms,
  PLATFORM_CATALOG,
} from './platforms';

describe('platform catalog', () => {
  it('keeps supported and planned platforms in product order', () => {
    expect(getSupportedPlatforms().map((platform) => platform.name)).toEqual([
      '知乎',
      'X',
      'V2EX',
      'Linux DO',
      '微博',
    ]);
    expect(getPlannedPlatforms().map((platform) => [
      platform.name,
      platform.plannedOrder,
    ])).toEqual([
      ['小红书', 1],
      ['哔哩哔哩', 2],
      ['YouTube', 3],
      ['Reddit', 4],
    ]);
  });

  it('uses unique ids and navigation positions', () => {
    expect(new Set(PLATFORM_CATALOG.map((platform) => platform.id)).size)
      .toBe(PLATFORM_CATALOG.length);
    expect(new Set(PLATFORM_CATALOG.map((platform) => platform.navOrder)).size)
      .toBe(PLATFORM_CATALOG.length);
  });

  it('recognizes supported host aliases without matching lookalike domains', () => {
    expect(getPlatformForUrl('https://zhuanlan.zhihu.com/p/1')?.id).toBe('zhihu');
    expect(getPlatformForUrl('https://mobile.twitter.com/home')?.id).toBe('twitter');
    expect(getPlatformForUrl('https://www.v2ex.com/')?.id).toBe('v2ex');
    expect(getPlatformForUrl('https://linux.do/latest')?.id).toBe('linux-do');
    expect(getPlatformForUrl('https://www.weibo.com/hot/weibo/102803')?.id).toBe('weibo');
    expect(getPlatformForUrl('https://linux.do.example.com/')).toBeUndefined();
    expect(getPlatformForUrl('not-a-url')).toBeUndefined();
  });
});
