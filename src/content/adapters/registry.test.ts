import { describe, expect, it, vi } from 'vitest';
import { createAdapter } from './registry';
import { TwitterAdapter } from './twitter';
import { ZhihuAdapter } from './zhihu';

describe('createAdapter', () => {
  it('selects adapters by exact domain or subdomain', () => {
    const onItems = vi.fn();

    expect(createAdapter('www.zhihu.com', onItems)).toMatchObject({
      adapter: expect.any(ZhihuAdapter),
      source: { id: 'zhihu', name: '知乎' },
    });
    expect(createAdapter('x.com', onItems)).toMatchObject({
      adapter: expect.any(TwitterAdapter),
      source: { id: 'twitter', name: 'X' },
    });
    expect(createAdapter('mobile.twitter.com', onItems)).toMatchObject({
      adapter: expect.any(TwitterAdapter),
      source: { id: 'twitter', name: 'X' },
    });
  });

  it('does not match lookalike or unsupported domains', () => {
    expect(createAdapter('notx.com', vi.fn())).toBeNull();
    expect(createAdapter('example.com', vi.fn())).toBeNull();
  });
});
