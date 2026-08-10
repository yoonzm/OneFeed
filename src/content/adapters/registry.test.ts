import { describe, expect, it, vi } from 'vitest';
import { createAdapter } from './registry';
import { LinuxDoAdapter } from './linuxDo';
import { TwitterAdapter } from './twitter';
import { V2exAdapter } from './v2ex';
import { ZhihuAdapter } from './zhihu';
import { ZhihuDetailAdapter } from './zhihuDetail';

function listeners() {
  return {
    onFeedItems: vi.fn(),
    onDetail: vi.fn(),
  };
}

describe('createAdapter', () => {
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
  });

  it('prioritizes supported Zhihu detail routes', () => {
    expect(createAdapter(
      new URL('https://www.zhihu.com/question/1/answer/42?utm_source=test#comment-1'),
      listeners(),
    )).toMatchObject({
      surface: 'detail',
      adapter: expect.any(ZhihuDetailAdapter),
      source: { id: 'zhihu', name: '知乎' },
    });
    expect(createAdapter(
      new URL('https://zhuanlan.zhihu.com/p/123/'),
      listeners(),
    )).toMatchObject({
      surface: 'detail',
      adapter: expect.any(ZhihuDetailAdapter),
    });
  });

  it('leaves unsupported site pages untouched', () => {
    expect(createAdapter(new URL('https://www.zhihu.com/question/1'), listeners())).toBeNull();
    expect(createAdapter(new URL('https://x.com/reader/status/123'), listeners())).toBeNull();
    expect(createAdapter(new URL('https://www.v2ex.com/t/123'), listeners())).toBeNull();
    expect(createAdapter(new URL('https://linux.do/t/topic/123'), listeners())).toBeNull();
    expect(createAdapter(new URL('https://www.zhihu.com/settings/account'), listeners())).toBeNull();
    expect(createAdapter(new URL('https://zhuanlan.zhihu.com/'), listeners())).toBeNull();
    expect(createAdapter(new URL('https://linux.do.example.com/latest'), listeners())).toBeNull();
    expect(createAdapter(new URL('https://example.com/'), listeners())).toBeNull();
  });
});
