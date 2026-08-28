import { describe, expect, it, vi } from 'vitest';
import {
  createWeiboSearchUrl,
  parseWeiboCard,
  parseWeiboCount,
  parseWeiboSearchCard,
  triggerWeiboAction,
} from './weibo';

describe('Weibo original-site search', () => {
  it('builds the native content-search route with a normalized query', () => {
    const target = createWeiboSearchUrl('  人工 智能  ');

    expect(target?.origin).toBe('https://s.weibo.com');
    expect(target?.pathname).toBe('/weibo');
    expect(target?.searchParams.get('q')).toBe('人工 智能');
    expect(createWeiboSearchUrl('   ')).toBeUndefined();
  });

  it('normalizes content results and ignores cards without a permanent post link', () => {
    document.body.innerHTML = `
      <div class="card-wrap" mid="5336257887404082" id="post-result">
        <div class="card-feed">
          <div class="avator">
            <a href="//weibo.com/u/1623886424">
              <img src="https://tvax.sinaimg.cn/avatar.jpg" />
            </a>
          </div>
          <div class="content">
            <div class="info">
              <a class="name" nick-name="新浪电影" href="//weibo.com/u/1623886424">
                新浪电影
              </a>
            </div>
            <p class="from">
              <a title="2026-08-27 09:58" href="//weibo.com/1623886424/RfiCC64Mb">
                7小时前
              </a>
            </p>
            <p class="txt" node-type="feed_list_content_full">
              <a href="//s.weibo.com/weibo?q=OneFeed">#OneFeed#</a> 搜索结果
              <img alt="[doge]" src="https://face.t.sinajs.cn/doge.png" />
              <a action-type="fl_unfold">展开全文</a><script>alert(1)</script>
            </p>
            <div class="media-piclist">
              <img
                src="data:image/gif;base64,placeholder"
                data-src="//wx1.sinaimg.cn/search.jpg"
                alt="搜索配图"
              />
            </div>
          </div>
        </div>
        <div class="card-act">
          <ul>
            <li>转发 1.1万</li>
            <li>评论 406</li>
            <li><a class="praised" action-type="feed_list_like" title="取消赞">赞 3228</a></li>
          </ul>
        </div>
      </div>
      <div class="card-wrap" mid="advertisement" id="auxiliary-result">
        <p class="txt" node-type="feed_list_content">推广内容</p>
      </div>`;
    const pageUrl = new URL('https://s.weibo.com/weibo?q=OneFeed');
    const item = parseWeiboSearchCard(document.querySelector('#post-result')!, pageUrl);

    expect(item).toMatchObject({
      id: 'weibo_RfiCC64Mb',
      originalUrl: 'https://weibo.com/1623886424/RfiCC64Mb',
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
      ],
    });
    expect(item?.actions[0]).toMatchObject({
      id: 'react',
      count: 3228,
      active: true,
      enabled: true,
    });
    expect(item?.previewBlocks).toEqual([
      {
        type: 'richText',
        html: expect.stringContaining('href="https://s.weibo.com/weibo?q=OneFeed"'),
        plainText: '#OneFeed# 搜索结果 [doge]',
      },
      {
        type: 'gallery',
        items: [{ url: 'https://wx1.sinaimg.cn/search.jpg', alt: '搜索配图' }],
      },
    ]);
    expect(parseWeiboSearchCard(
      document.querySelector('#auxiliary-result')!,
      pageUrl,
    )).toBeNull();
  });
});

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
  it.each([
    '<button class="woo-like-main">赞</button>',
    '<a action-type="feed_list_like">赞</a>',
  ])('proxies a native like control and ignores unknown actions', (control) => {
    document.body.innerHTML = `<article>${control}</article>`;
    const element = document.querySelector<HTMLElement>('button, a')!;
    const click = vi.spyOn(element, 'click').mockImplementation(() => undefined);

    expect(triggerWeiboAction(document.querySelector('article')!, 'react')).toBe(true);
    expect(click).toHaveBeenCalledOnce();
    expect(triggerWeiboAction(document.querySelector('article')!, 'share')).toBe(false);
  });
});
