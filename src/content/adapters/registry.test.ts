import { describe, expect, it, vi } from 'vitest';
import { getSupportedPlatforms } from '../../config/platforms';
import { createAdapter, getRegisteredPlatformIds, isSupportedUrl } from './registry';
import { LinuxDoAdapter } from './linuxDo';
import { LinuxDoThreadAdapter } from './linuxDoThread';
import { TwitterAdapter } from './twitter';
import { V2exAdapter } from './v2ex';
import { V2exThreadAdapter } from './v2exThread';
import { WeiboAdapter } from './weibo';
import { XiaohongshuAdapter } from './xiaohongshu';
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
    expect(createAdapter(new URL('https://x.com/home'), listeners())).toMatchObject({
      surface: 'feed',
      adapter: expect.any(TwitterAdapter),
      source: { id: 'twitter', name: 'X' },
    });
    expect(createAdapter(new URL('https://www.v2ex.com/?tab=hot'), listeners())).toMatchObject({
      surface: 'feed',
      adapter: expect.any(V2exAdapter),
      source: { id: 'v2ex', name: 'V2EX' },
    });
    expect(createAdapter(new URL('https://linux.do/latest'), listeners())).toMatchObject({
      surface: 'feed',
      adapter: expect.any(LinuxDoAdapter),
      source: { id: 'linux-do', name: 'Linux DO' },
    });
    expect(createAdapter(new URL('https://weibo.com/hot/weibo/102803'), listeners())).toMatchObject({
      surface: 'feed',
      adapter: expect.any(WeiboAdapter),
      source: { id: 'weibo', name: '微博' },
    });
    expect(createAdapter(
      new URL('https://weibo.com/newlogin?tabtype=weibo&gid=102803&openLoginLayer=0&url=https://weibo.com/'),
      listeners(),
    )).toMatchObject({
      surface: 'feed',
      adapter: expect.any(WeiboAdapter),
      source: { id: 'weibo', name: '微博' },
    });
    expect(createAdapter(
      new URL('https://www.xiaohongshu.com/explore?channel_id=homefeed_recommend'),
      listeners(),
    )).toMatchObject({
      surface: 'feed',
      adapter: expect.any(XiaohongshuAdapter),
      source: { id: 'xiaohongshu', name: '小红书' },
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
    expect(createAdapter(new URL('https://x.com/reader/status/123'), listeners())).toBeNull();
    expect(createAdapter(new URL('https://linux.do/settings/account'), listeners())).toBeNull();
    expect(createAdapter(new URL('https://weibo.com/newlogin'), listeners())).toBeNull();
    expect(createAdapter(
      new URL('https://weibo.com/newlogin?tabtype=weibo&url=https://example.com/'),
      listeners(),
    )).toBeNull();
    expect(createAdapter(new URL('https://m.weibo.com/'), listeners())).toBeNull();
    expect(createAdapter(
      new URL('https://www.xiaohongshu.com/explore/note-id'),
      listeners(),
    )).toBeNull();
    expect(createAdapter(new URL('https://creator.xiaohongshu.com/'), listeners())).toBeNull();
    expect(createAdapter(new URL('https://www.zhihu.com/settings/account'), listeners())).toBeNull();
    expect(createAdapter(new URL('https://zhuanlan.zhihu.com/'), listeners())).toBeNull();
    expect(createAdapter(new URL('https://linux.do.example.com/latest'), listeners())).toBeNull();
    expect(createAdapter(new URL('https://example.com/'), listeners())).toBeNull();
  });

  it('reports whether a URL supports early page takeover', () => {
    expect(isSupportedUrl(new URL('https://www.zhihu.com/'))).toBe(true);
    expect(isSupportedUrl(new URL('https://www.zhihu.com/question/1/answer/42'))).toBe(true);
    expect(isSupportedUrl(new URL('https://www.zhihu.com/settings/account'))).toBe(false);
    expect(isSupportedUrl(new URL('https://weibo.com/mygroups?gid=11000'))).toBe(true);
    expect(isSupportedUrl(new URL('https://www.xiaohongshu.com/explore'))).toBe(true);
    expect(isSupportedUrl(new URL('https://www.xiaohongshu.com/explore/note-id'))).toBe(false);
  });
});
