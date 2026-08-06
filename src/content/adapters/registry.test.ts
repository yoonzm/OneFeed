import { describe, expect, it, vi } from 'vitest';
import { createAdapter } from './registry';
import { LinuxDoAdapter } from './linuxDo';
import { TwitterAdapter } from './twitter';
import { V2exAdapter } from './v2ex';
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
    expect(createAdapter('www.v2ex.com', onItems)).toMatchObject({
      adapter: expect.any(V2exAdapter),
      source: { id: 'v2ex', name: 'V2EX' },
    });
    expect(createAdapter('linux.do', onItems)).toMatchObject({
      adapter: expect.any(LinuxDoAdapter),
      source: { id: 'linux-do', name: 'Linux DO' },
    });
  });

  it('does not match lookalike or unsupported domains', () => {
    expect(createAdapter('notx.com', vi.fn())).toBeNull();
    expect(createAdapter('fakev2ex.com', vi.fn())).toBeNull();
    expect(createAdapter('linux.do.example.com', vi.fn())).toBeNull();
    expect(createAdapter('example.com', vi.fn())).toBeNull();
  });
});
