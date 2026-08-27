import { describe, expect, it, vi } from 'vitest';
import {
  XiaohongshuAdapter,
  parseXiaohongshuCard,
  parseXiaohongshuCount,
  triggerXiaohongshuAction,
} from './xiaohongshu';

describe('parseXiaohongshuCount', () => {
  it('parses exact and Chinese compact counts', () => {
    expect(parseXiaohongshuCount('6521')).toBe(6521);
    expect(parseXiaohongshuCount('1.3万')).toBe(13000);
    expect(parseXiaohongshuCount('2亿')).toBe(200000000);
  });
});

describe('parseXiaohongshuCard', () => {
  it('normalizes an explore note without requiring renderer changes', () => {
    document.body.innerHTML = `
      <section class="note-item" data-note-id="6a62c8e4" data-width="1200" data-height="1600">
        <a class="cover" href="/explore/6a62c8e4?xsec_token=token">
          <img src="https://sns-webpic-qc.xhscdn.com/note.webp" alt="笔记封面" />
        </a>
        <a class="title" href="/explore/6a62c8e4?xsec_token=token">周末阅读清单</a>
        <div class="author-wrapper">
          <a class="author" href="/user/profile/reader">
            <img class="author-avatar" src="https://sns-avatar-qc.xhscdn.com/avatar.webp" />
            <span class="name">阅读者</span>
          </a>
          <span class="like-wrapper"><span class="count">1.3万</span></span>
        </div>
      </section>`;

    const item = parseXiaohongshuCard(
      document.querySelector('section')!,
      new URL('https://www.xiaohongshu.com/explore'),
    );

    expect(item).toMatchObject({
      id: 'xiaohongshu_6a62c8e4',
      platform: 'xiaohongshu',
      originalUrl: 'https://www.xiaohongshu.com/explore/6a62c8e4?xsec_token=token',
      kind: 'post',
      role: 'post',
      title: '周末阅读清单',
      author: {
        name: '阅读者',
        avatar: 'https://sns-avatar-qc.xhscdn.com/avatar.webp',
        link: 'https://www.xiaohongshu.com/user/profile/reader',
      },
      metrics: [{ kind: 'reactions', value: 13000 }],
    });
    expect(item?.previewBlocks).toEqual([{
      type: 'gallery',
      items: [{
        url: 'https://sns-webpic-qc.xhscdn.com/note.webp',
        alt: '笔记封面',
        width: 1200,
        height: 1600,
        aspectRatio: 0.75,
      }],
    }]);
    expect(item?.actions[0]).toMatchObject({
      id: 'react',
      count: 13000,
      enabled: true,
    });
  });
});

describe('XiaohongshuAdapter interactions', () => {
  it('discovers feed channels and proxies the original like control', () => {
    document.body.innerHTML = `
      <div class="channel-container">
        <div id="homefeed_recommend" class="channel active">推荐</div>
        <div id="homefeed.food_v3" class="channel">美食</div>
      </div>
      <section class="note-item" data-note-id="note-1">
        <a class="cover" href="/explore/note-1"><img src="/cover.jpg" /></a>
        <span class="like-wrapper"><span class="count">8</span></span>
      </section>`;
    const adapter = new XiaohongshuAdapter(vi.fn());
    adapter.init();

    expect(adapter.getFeedChannels().map(({ id, label, active }) => ({ id, label, active })))
      .toEqual([
        { id: 'homefeed_recommend', label: '推荐', active: true },
        { id: 'homefeed.food_v3', label: '美食', active: false },
      ]);

    const control = document.querySelector<HTMLElement>('.like-wrapper')!;
    const click = vi.spyOn(control, 'click').mockImplementation(() => undefined);
    expect(triggerXiaohongshuAction(document.querySelector('section')!, 'react')).toBe(true);
    expect(click).toHaveBeenCalledOnce();
    expect(triggerXiaohongshuAction(document.querySelector('section')!, 'share')).toBe(false);
    adapter.disconnect();
  });
});
