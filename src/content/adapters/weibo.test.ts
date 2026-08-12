import { describe, expect, it, vi } from 'vitest';
import {
  parseWeiboCard,
  parseWeiboCount,
  triggerWeiboAction,
  WeiboAdapter,
} from './weibo';

describe('parseWeiboCount', () => {
  it('parses plain and compact interaction counts', () => {
    expect(parseWeiboCount('转发 1,234')).toBe(1234);
    expect(parseWeiboCount('评论 2.5万+')).toBe(25000);
    expect(parseWeiboCount('1.2亿 次播放')).toBe(120000000);
    expect(parseWeiboCount('赞')).toBe(0);
  });
});

describe('parseWeiboCard', () => {
  it('normalizes a graphic post and sanitizes its rich text', () => {
    document.body.innerHTML = `
      <article data-testid="feed-card" data-mid="502001">
        <a class="head-info_nick_ab12" href="https://weibo.com/u/10001">林一</a>
        <div class="head-info_avatar_ab12">
          <img src="https://tvax.example/avatar.jpg" />
        </div>
        <div class="head-info_time_ab12">
          <a href="https://weibo.com/10001/P0abc" title="2026-08-12 10:30">刚刚</a>
        </div>
        <div class="detail_wbtext_ab12" data-testid="feed-content">
          <span style="color:red">今天的晚霞</span>
          <img src="https://img.example/emoji.png" alt="🌆" />
          <a href="https://weibo.com/n/Sky">@Sky</a>
          <script>alert(1)</script>
        </div>
        <div data-testid="feed-picture">
          <img data-src="https://wx1.example/sunset.jpg" alt="晚霞" />
          <img data-src="https://wx1.example/sunset.jpg" alt="重复图片" />
        </div>
        <div class="toolbar_item_ab12"><i class="woo-font--retweet"></i><span>转发 18</span></div>
        <div class="toolbar_item_ab12"><i class="woo-font--comment"></i><span>评论 36</span></div>
        <div class="toolbar_item_ab12 toolbar-liked"><i class="woo-font--like"></i><span>赞 1.2万</span></div>
      </article>`;

    const item = parseWeiboCard(document.querySelector('article')!);

    expect(item).toMatchObject({
      id: 'weibo_502001',
      platform: 'weibo',
      source: { id: 'weibo', name: '微博' },
      originalUrl: 'https://weibo.com/10001/P0abc',
      kind: 'post',
      role: 'post',
      author: {
        name: '林一',
        avatar: 'https://tvax.example/avatar.jpg',
        link: 'https://weibo.com/u/10001',
      },
      publishedAt: '2026-08-12 10:30',
      metrics: [
        { kind: 'reposts', value: 18, label: '转发' },
        { kind: 'replies', value: 36, label: '评论' },
        { kind: 'reactions', value: 12000, label: '赞' },
      ],
    });
    const text = item?.previewBlocks.find((block) => block.type === 'richText');
    const gallery = item?.previewBlocks.find((block) => block.type === 'gallery');
    expect(text).toMatchObject({ plainText: '今天的晚霞 🌆 @Sky' });
    expect(text?.html).toContain('href="https://weibo.com/n/Sky"');
    expect(text?.html).not.toContain('script');
    expect(text?.html).not.toContain('style=');
    expect(gallery?.items).toEqual([{
      url: 'https://wx1.example/sunset.jpg',
      alt: '晚霞',
    }]);
    expect(item?.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'repost', count: 18 }),
      expect.objectContaining({ id: 'reply', count: 36 }),
      expect.objectContaining({ id: 'react', count: 12000, active: true }),
    ]));
    expect(item).not.toHaveProperty('rawElementRef');
  });

  it('normalizes video and quoted-post blocks with repost context', () => {
    document.body.innerHTML = `
      <article data-testid="feed-card" data-mid="502002">
        <a class="head-info_nick_top" href="https://weibo.com/u/20002">转发用户</a>
        <div class="head-info_time_top">
          <a href="https://weibo.com/20002/P0top" title="2026-08-12 11:00">1 小时前</a>
        </div>
        <div data-testid="feed-content">值得一看</div>
        <div data-testid="feed-video">
          <video poster="https://wx2.example/poster.jpg" src="https://video.example/clip.mp4"></video>
        </div>
        <section data-testid="feed-repost" data-mid="501999">
          <a class="head-info_nick_quote" href="https://weibo.com/u/30003">原作者</a>
          <div class="head-info_time_quote"><a href="https://weibo.com/30003/P0origin">昨天</a></div>
          <div data-testid="feed-content">原微博内容</div>
        </section>
      </article>`;

    const item = parseWeiboCard(document.querySelector('article')!);
    const video = item?.previewBlocks.find((block) => block.type === 'video');
    const quote = item?.previewBlocks.find((block) => block.type === 'quote');

    expect(video?.media).toMatchObject({
      poster: 'https://wx2.example/poster.jpg',
      url: 'https://video.example/clip.mp4',
    });
    expect(quote?.item).toMatchObject({
      id: 'weibo_501999',
      originalUrl: 'https://weibo.com/30003/P0origin',
      author: { name: '原作者', link: 'https://weibo.com/u/30003' },
      text: '原微博内容',
    });
    expect(item?.context).toMatchObject({
      reason: {
        type: 'repost',
        label: '转发了这条微博',
        actor: { name: '转发用户' },
      },
    });
  });

  it('keeps media-only posts and rejects empty cards', () => {
    document.body.innerHTML = `
      <article id="with-image" data-testid="feed-card" data-mid="1">
        <div data-testid="feed-picture"><img src="https://wx1.example/image.jpg" /></div>
      </article>
      <article id="empty" data-testid="feed-card" data-mid="2"></article>`;

    expect(parseWeiboCard(document.querySelector('#with-image')!)).not.toBeNull();
    expect(parseWeiboCard(document.querySelector('#empty')!)).toBeNull();
  });

  it('parses the current CSS Module card structure used by the redirected feed', () => {
    document.body.innerHTML = `
      <div class="vue-recycle-scroller__item-view">
        <article class="woo-panel-main _wrap_ecgcn_2 _normal_ecgcn_34">
          <img class="woo-avatar-img" src="https://tvax.example/current-avatar.jpg" />
          <a usercard href="https://weibo.com/u/40004" class="_name_ygi5b_120">新版用户</a>
          <a class="_time_1tpft_33" title="2026-08-12 12:00"
            href="https://weibo.com/40004/P0current">2 小时前</a>
          <div class="wbpro-feed-content">
            <div class="_text_1h76l_2 _ogText_1h76l_43 wbpro-feed-ogText">
              <div class="_wbtext_1h76l_19">新版微博正文</div>
            </div>
            <div class="picture _row_a3hty_13">
              <div class="woo-picture-main _pic_a3hty_16">
                <img class="woo-picture-img" src="https://wx1.example/current.jpg" />
              </div>
            </div>
          </div>
          <div class="_item_198pe_23"><i class="woo-font--retweet"></i><span>8</span></div>
          <div class="_item_198pe_23"><i class="woo-font--comment"></i><span>12</span></div>
          <button class="woo-like-main _btn_198pe_22"><i class="woo-like-icon"></i><span>25</span></button>
        </article>
      </div>`;

    const item = parseWeiboCard(document.querySelector('article')!);

    expect(item).toMatchObject({
      id: 'weibo_P0current',
      originalUrl: 'https://weibo.com/40004/P0current',
      author: {
        name: '新版用户',
        avatar: 'https://tvax.example/current-avatar.jpg',
        link: 'https://weibo.com/u/40004',
      },
      publishedAt: '2026-08-12 12:00',
      metrics: [
        { kind: 'reposts', value: 8 },
        { kind: 'replies', value: 12 },
        { kind: 'reactions', value: 25 },
      ],
    });
    expect(item?.previewBlocks).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'richText', plainText: '新版微博正文' }),
      expect.objectContaining({
        type: 'gallery',
        items: [{ url: 'https://wx1.example/current.jpg', alt: '' }],
      }),
    ]));
  });
});

describe('triggerWeiboAction', () => {
  it('proxies supported interactions to the original card', () => {
    document.body.innerHTML = `
      <article>
        <button data-testid="repost"></button>
        <button data-testid="comment"></button>
        <div class="toolbar_item_test"><i class="woo-font--like"></i></div>
      </article>`;
    const element = document.querySelector('article')!;
    const likeButton = document.querySelector<HTMLElement>('.toolbar_item_test')!;
    const click = vi.spyOn(likeButton, 'click');

    expect(triggerWeiboAction(element, 'react')).toBe(true);
    expect(click).toHaveBeenCalledOnce();
    expect(triggerWeiboAction(element, 'bookmark')).toBe(false);
  });
});

describe('WeiboAdapter', () => {
  it('deduplicates nested quote cards and rescans infinite-feed updates', async () => {
    document.body.innerHTML = `
      <article data-testid="feed-card" data-mid="first">
        <div data-testid="feed-content">第一条微博</div>
        <section data-testid="feed-repost">
          <article data-testid="feed-card" data-mid="quoted">
            <div data-testid="feed-content">被引用的微博</div>
          </article>
        </section>
      </article>`;
    const onItems = vi.fn();
    const adapter = new WeiboAdapter(onItems);

    adapter.init();
    expect(onItems).toHaveBeenLastCalledWith([
      expect.objectContaining({ id: 'weibo_first' }),
    ]);

    document.body.insertAdjacentHTML('beforeend', `
      <article data-testid="feed-card" data-mid="second">
        <div data-testid="feed-content">无限流新增微博</div>
      </article>`);
    await vi.waitFor(() => expect(onItems).toHaveBeenLastCalledWith([
      expect.objectContaining({ id: 'weibo_first' }),
      expect.objectContaining({ id: 'weibo_second' }),
    ]));

    adapter.disconnect();
    expect(adapter.triggerAction('weibo_first', 'react')).toBe(false);
  });
});
