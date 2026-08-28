import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  findWeiboDetailRoot,
  isWeiboDetailUrl,
  parseWeiboDetail,
  WeiboDetailAdapter,
} from './weiboDetail';

function renderPost(uid = '1623886424', postId = 'RfiCC64Mb'): Element {
  document.body.innerHTML = `
    <main>
      <article tabindex="0">
        <header>
          <img class="woo-avatar-img" src="https://tvax.sinaimg.cn/avatar.jpg" />
          <a usercard="${uid}" href="//weibo.com/u/${uid}"><span>新浪电影</span></a>
          <a title="2026-08-27 09:58" href="https://weibo.com/${uid}/${postId}">7小时前</a>
        </header>
        <div class="wbpro-feed-content">
          <div class="wbpro-feed-ogText">
            <div><a href="/n/OneFeed">@OneFeed</a> 详情页完整正文</div>
          </div>
          <div class="picture">
            <img src="https://wx1.sinaimg.cn/detail.jpg" alt="详情配图" />
          </div>
          <div class="video-js">
            <video src="//f.video.weibocdn.com/detail.mp4"></video>
            <div class="vjs-poster"><img src="https://wx1.sinaimg.cn/poster.jpg" /></div>
            <span class="vjs-duration-display">01:05</span>
          </div>
          <span>64.2万次观看</span>
        </div>
        <footer aria-label="1.1万,406,3228">
          <button class="woo-like-main" title="赞">3228</button>
        </footer>
      </article>
    </main>`;
  return document.querySelector('article')!;
}

afterEach(() => {
  window.history.replaceState({}, '', '/');
});

describe('isWeiboDetailUrl', () => {
  it('matches canonical post pages without taking over unrelated or lookalike routes', () => {
    expect(isWeiboDetailUrl(new URL('https://weibo.com/1623886424/RfiCC64Mb'))).toBe(true);
    expect(isWeiboDetailUrl(new URL('https://www.weibo.com/1623886424/RfiCC64Mb/'))).toBe(true);
    expect(isWeiboDetailUrl(new URL('https://weibo.com/hot/search'))).toBe(false);
    expect(isWeiboDetailUrl(new URL('https://weibo.com/1623886424/not-valid-id!'))).toBe(false);
    expect(isWeiboDetailUrl(
      new URL('https://weibo.com.example.com/1623886424/RfiCC64Mb'),
    )).toBe(false);
  });
});

describe('Weibo post detail', () => {
  it('normalizes the complete post, media, metrics, and native like action', () => {
    const element = renderPost();
    const detail = parseWeiboDetail(
      element,
      new URL('https://weibo.com/1623886424/RfiCC64Mb'),
    );

    expect(detail).toMatchObject({
      id: 'weibo_RfiCC64Mb',
      platform: 'weibo',
      source: { id: 'weibo', name: '微博' },
      originalUrl: 'https://weibo.com/1623886424/RfiCC64Mb',
      kind: 'article',
      role: 'post',
      author: {
        name: '新浪电影',
        avatar: 'https://tvax.sinaimg.cn/avatar.jpg',
        link: 'https://weibo.com/u/1623886424',
      },
      publishedAt: '2026-08-27 09:58',
      actionSlots: {
        footer: {
          metrics: [
            { kind: 'reposts', value: 11000 },
            { kind: 'replies', value: 406 },
            { kind: 'reactions', value: 3228 },
            { kind: 'views', value: 642000 },
          ],
          actions: [{ id: 'react', kind: 'react', count: 3228, enabled: true }],
        },
      },
    });
    expect(detail?.body).toEqual([
      {
        type: 'richText',
        html: expect.stringContaining('href="https://weibo.com/n/OneFeed"'),
        plainText: '@OneFeed 详情页完整正文',
      },
      {
        type: 'gallery',
        items: [{ url: 'https://wx1.sinaimg.cn/detail.jpg', alt: '详情配图' }],
      },
      {
        type: 'video',
        media: {
          poster: 'https://wx1.sinaimg.cn/poster.jpg',
          url: 'https://f.video.weibocdn.com/detail.mp4',
          durationSeconds: 65,
        },
      },
    ]);
  });

  it('does not publish stale post DOM for a different detail URL', () => {
    renderPost('1623886424', 'RfiCC64Mb');

    expect(findWeiboDetailRoot(
      document,
      new URL('https://weibo.com/1623886424/AnotherPost'),
    )).toBeNull();
  });

  it('publishes the active detail and proxies likes only for the active post', () => {
    renderPost();
    window.history.replaceState({}, '', '/1623886424/RfiCC64Mb');
    const button = document.querySelector<HTMLButtonElement>('.woo-like-main')!;
    const click = vi.spyOn(button, 'click').mockImplementation(() => undefined);
    const onDetail = vi.fn();
    const adapter = new WeiboDetailAdapter(onDetail);

    adapter.init();

    expect(onDetail).toHaveBeenCalledOnce();
    expect(onDetail.mock.lastCall?.[0]).toMatchObject({
      id: 'weibo_RfiCC64Mb',
      role: 'post',
    });
    expect(adapter.triggerAction('weibo_RfiCC64Mb', 'react')).toBe(true);
    expect(click).toHaveBeenCalledOnce();
    expect(adapter.triggerAction('weibo_other', 'react')).toBe(false);
    adapter.disconnect();
  });
});
