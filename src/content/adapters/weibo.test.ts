import { describe, expect, it, vi } from 'vitest';
import {
  parseWeiboCard,
  parseWeiboCount,
  triggerWeiboAction,
} from './weibo';

describe('parseWeiboCount', () => {
  it('parses exact and Chinese compact counts', () => {
    expect(parseWeiboCount('3228')).toBe(3228);
    expect(parseWeiboCount('1.1万')).toBe(11000);
    expect(parseWeiboCount('100万+')).toBe(1000000);
  });
});

describe('parseWeiboCard', () => {
  it('normalizes a semantic article with text, media, metrics, and author data', () => {
    document.body.innerHTML = `
      <article tabindex="0">
        <header>
          <img class="woo-avatar-img" src="https://tvax.sinaimg.cn/avatar.jpg" />
          <a usercard="1623886424" href="//weibo.com/u/1623886424"><span>新浪电影</span></a>
          <a title="2026-08-27 09:58" href="https://weibo.com/1623886424/RfiCC64Mb">7小时前</a>
        </header>
        <div class="wbpro-feed-content">
          <div class="wbpro-feed-ogText">
            <div>
              <a href="//s.weibo.com/weibo?q=OneFeed">#OneFeed#</a> 新鲜事
              <img alt="[doge]" src="https://face.t.sinajs.cn/doge.png" />
              <script>alert(1)</script><span class="expand">展开</span>
            </div>
          </div>
          <div class="picture"><img src="https://wx1.sinaimg.cn/photo.jpg" alt="配图" /></div>
          <div class="video-js">
            <video src="//f.video.weibocdn.com/video.mp4"></video>
            <div class="vjs-poster"><img src="https://wx1.sinaimg.cn/poster.jpg" /></div>
            <span class="vjs-duration-display">00:56</span>
          </div>
          <span>64.2万次观看</span>
        </div>
        <footer aria-label="1.1万,406,3228">
          <button class="woo-like-main" title="赞"><span class="woo-like-count">3228</span></button>
        </footer>
      </article>`;

    const item = parseWeiboCard(
      document.querySelector('article')!,
      new URL('https://weibo.com/newlogin?tabtype=weibo'),
    );

    expect(item).toMatchObject({
      id: 'weibo_RfiCC64Mb',
      platform: 'weibo',
      originalUrl: 'https://weibo.com/1623886424/RfiCC64Mb',
      kind: 'post',
      role: 'post',
      author: {
        name: '新浪电影',
        avatar: 'https://tvax.sinaimg.cn/avatar.jpg',
        link: 'https://weibo.com/u/1623886424',
      },
      publishedAt: '2026-08-27 09:58',
      metrics: [
        { kind: 'reposts', value: 11000 },
        { kind: 'replies', value: 406 },
        { kind: 'reactions', value: 3228 },
        { kind: 'views', value: 642000 },
      ],
    });
    expect(item?.previewBlocks).toEqual([
      {
        type: 'richText',
        html: expect.stringContaining('data-onefeed-kind="emoji"'),
        plainText: '#OneFeed# 新鲜事 [doge]',
      },
      {
        type: 'gallery',
        items: [{ url: 'https://wx1.sinaimg.cn/photo.jpg', alt: '配图' }],
      },
      {
        type: 'video',
        media: {
          poster: 'https://wx1.sinaimg.cn/poster.jpg',
          url: 'https://f.video.weibocdn.com/video.mp4',
          durationSeconds: 56,
        },
      },
    ]);
    expect(item?.previewBlocks[0]?.type === 'richText' ? item.previewBlocks[0].html : '')
      .not.toContain('<script');
    expect(item?.actions[0]).toMatchObject({ id: 'react', count: 3228, enabled: true });
  });

  it('ignores auxiliary article nodes without a post permalink', () => {
    document.body.innerHTML = '<article><header><a href="/u/42">Author</a></header></article>';
    expect(parseWeiboCard(
      document.querySelector('article')!,
      new URL('https://weibo.com/'),
    )).toBeNull();
  });
});

describe('triggerWeiboAction', () => {
  it('proxies the native like button and ignores unknown actions', () => {
    document.body.innerHTML = '<article><button class="woo-like-main">赞</button></article>';
    const button = document.querySelector<HTMLButtonElement>('button')!;
    const click = vi.spyOn(button, 'click').mockImplementation(() => undefined);

    expect(triggerWeiboAction(document.querySelector('article')!, 'react')).toBe(true);
    expect(click).toHaveBeenCalledOnce();
    expect(triggerWeiboAction(document.querySelector('article')!, 'share')).toBe(false);
  });
});
