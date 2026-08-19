import { describe, expect, it, vi } from 'vitest';
import { getSupportedPlatforms } from '../../config/platforms';
import { createAdapter, getRegisteredPlatformIds, isSupportedUrl } from './registry';
import { HackerNewsAdapter } from './hackerNews';
import { LinuxDoAdapter } from './linuxDo';
import { LinuxDoThreadAdapter } from './linuxDoThread';
import { V2exAdapter } from './v2ex';
import { V2exThreadAdapter } from './v2exThread';
import { ZhihuAdapter } from './zhihu';
import { ZhihuDetailAdapter } from './zhihuDetail';
import { ZhihuThreadAdapter } from './zhihuThread';

function listeners() {
  return {
    onFeedItems: vi.fn(),
    onDetail: vi.fn(),
  };
}

describe('createAdapter', () => {
  it('registers a feed adapter for every supported platform', () => {
    expect(getRegisteredPlatformIds()).toEqual(
      getSupportedPlatforms().map((platform) => platform.id),
    );
  });

  it('selects feed adapters by supported URL', () => {
    expect(createAdapter(new URL('https://www.zhihu.com/'), listeners())).toMatchObject({
      surface: 'feed',
      adapter: expect.any(ZhihuAdapter),
      source: { id: 'zhihu', name: '知乎' },
    });
    expect(createAdapter(new URL('https://www.v2ex.com/?tab=hot'), listeners())).toMatchObject({
      surface: 'feed',
      adapter: expect.any(V2exAdapter),
      source: { id: 'v2ex', name: 'V2EX' },
    });
    expect(createAdapter(new URL('https://www.v2ex.com/xna'), listeners())).toMatchObject({
      surface: 'feed',
      adapter: expect.any(V2exAdapter),
    });
    expect(createAdapter(new URL('https://linux.do/latest'), listeners())).toMatchObject({
      surface: 'feed',
      adapter: expect.any(LinuxDoAdapter),
      source: { id: 'linux-do', name: 'Linux DO' },
    });
    expect(createAdapter(new URL('https://news.ycombinator.com/best'), listeners())).toMatchObject({
      surface: 'feed',
      adapter: expect.any(HackerNewsAdapter),
      source: { id: 'hacker-news', name: 'Hacker News' },
    });
  });

  it('prioritizes supported Zhihu detail routes', () => {
    expect(createAdapter(
      new URL('https://www.zhihu.com/question/1/answer/42?utm_source=test#comment-1'),
      listeners(),
    )).toMatchObject({
      surface: 'article',
      adapter: expect.any(ZhihuDetailAdapter),
      source: { id: 'zhihu', name: '知乎' },
    });
    expect(createAdapter(
      new URL('https://zhuanlan.zhihu.com/p/123/'),
      listeners(),
    )).toMatchObject({
      surface: 'article',
      adapter: expect.any(ZhihuDetailAdapter),
    });
  });

  it('selects thread adapters for question and topic detail routes', () => {
    expect(createAdapter(
      new URL('https://www.zhihu.com/question/1'),
      listeners(),
    )).toMatchObject({
      surface: 'thread',
      adapter: expect.any(ZhihuThreadAdapter),
    });
    expect(createAdapter(
      new URL('https://www.v2ex.com/t/123?p=2'),
      listeners(),
    )).toMatchObject({
      surface: 'thread',
      adapter: expect.any(V2exThreadAdapter),
    });
    expect(createAdapter(
      new URL('https://linux.do/t/topic/2735915/18'),
      listeners(),
    )).toMatchObject({
      surface: 'thread',
      adapter: expect.any(LinuxDoThreadAdapter),
      source: { id: 'linux-do', name: 'Linux DO' },
    });
  });

  it('leaves unsupported site pages untouched', () => {
    expect(createAdapter(new URL('https://x.com/home'), listeners())).toBeNull();
    expect(createAdapter(new URL('https://linux.do/settings/account'), listeners())).toBeNull();
    expect(createAdapter(new URL('https://weibo.com/'), listeners())).toBeNull();
    expect(createAdapter(new URL('https://www.xiaohongshu.com/explore'), listeners())).toBeNull();
    expect(createAdapter(new URL('https://www.zhihu.com/settings/account'), listeners())).toBeNull();
    expect(createAdapter(new URL('https://zhuanlan.zhihu.com/'), listeners())).toBeNull();
    expect(createAdapter(new URL('https://news.ycombinator.com/item?id=43876543'), listeners())).toBeNull();
    expect(createAdapter(
      new URL('https://www.reddit.com/'),
      listeners(),
    )).toBeNull();
    expect(createAdapter(new URL('https://news.ycombinator.com.example.com/news'), listeners())).toBeNull();
    expect(createAdapter(new URL('https://linux.do.example.com/latest'), listeners())).toBeNull();
    expect(createAdapter(new URL('https://example.com/'), listeners())).toBeNull();
  });

  it('reports whether a URL supports early page takeover', () => {
    expect(isSupportedUrl(new URL('https://www.zhihu.com/'))).toBe(true);
    expect(isSupportedUrl(new URL('https://www.zhihu.com/question/1/answer/42'))).toBe(true);
    expect(isSupportedUrl(new URL('https://www.zhihu.com/settings/account'))).toBe(false);
    expect(isSupportedUrl(new URL('https://x.com/home'))).toBe(false);
    expect(isSupportedUrl(new URL('https://weibo.com/'))).toBe(false);
    expect(isSupportedUrl(new URL('https://www.xiaohongshu.com/explore'))).toBe(false);
    expect(isSupportedUrl(new URL('https://news.ycombinator.com/news'))).toBe(true);
    expect(isSupportedUrl(new URL('https://news.ycombinator.com/item?id=43876543'))).toBe(false);
    expect(isSupportedUrl(new URL('https://www.reddit.com/'))).toBe(false);
  });
});
