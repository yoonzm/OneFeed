import { describe, expect, it, vi } from 'vitest';
import {
  parseXiaohongshuCard,
  parseXiaohongshuCount,
  triggerXiaohongshuAction,
  XiaohongshuAdapter,
} from './xiaohongshu';

describe('parseXiaohongshuCount', () => {
  it('parses plain and compact interaction counts', () => {
    expect(parseXiaohongshuCount('1,234')).toBe(1234);
    expect(parseXiaohongshuCount('1.2万+')).toBe(12000);
    expect(parseXiaohongshuCount('2.5K')).toBe(2500);
    expect(parseXiaohongshuCount('喜欢')).toBe(0);
  });
});

describe('parseXiaohongshuCard', () => {
  it('normalizes an image note with its aspect ratio, author, and like state', () => {
    document.body.innerHTML = `
      <section class="note-item" data-note-id="note-image" data-width="1080" data-height="1440">
        <a class="cover" href="/explore/note-image?xsec_token=test">
          <img data-src="https://sns-webpic.example/cover.webp" alt="山间日落" />
        </a>
        <div class="footer">
          <a class="title" href="/explore/note-image?xsec_token=test">周末去山里看日落</a>
          <div class="author-wrapper">
            <a class="author" href="/user/profile/reader">
              <img class="author-avatar" src="https://sns-avatar.example/reader.webp" />
              <span class="name">阅读者</span>
            </a>
            <span class="like-wrapper" aria-pressed="true">
              <svg><use xlink:href="#liked"></use></svg>
              <span class="count">1.2万+</span>
            </span>
          </div>
        </div>
      </section>`;

    const item = parseXiaohongshuCard(document.querySelector('section')!);

    expect(item).toMatchObject({
      id: 'xiaohongshu_note-image',
      platform: 'xiaohongshu',
      source: { id: 'xiaohongshu', name: '小红书' },
      kind: 'post',
      role: 'post',
      title: '周末去山里看日落',
      author: {
        name: '阅读者',
        avatar: 'https://sns-avatar.example/reader.webp',
      },
      metrics: [{ kind: 'reactions', value: 12000, label: '喜欢' }],
    });
    expect(item?.originalUrl).toBe(
      `${window.location.origin}/explore/note-image?xsec_token=test`,
    );
    expect(item?.author.link).toBe(`${window.location.origin}/user/profile/reader`);
    expect(item?.previewBlocks).toEqual([{
      type: 'gallery',
      items: [{
        url: 'https://sns-webpic.example/cover.webp',
        alt: '山间日落',
        width: 1080,
        height: 1440,
        aspectRatio: 0.75,
      }],
    }]);
    expect(item?.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'react', count: 12000, active: true }),
      expect.objectContaining({ id: 'bookmark', fallback: 'openOriginal' }),
    ]));
    expect(item).not.toHaveProperty('rawElementRef');
  });

  it('represents video notes with a poster and keeps vertical media dimensions', () => {
    document.body.innerHTML = `
      <section class="note-item" data-note-id="note-video" data-width="1080" data-height="1920">
        <a class="cover" href="https://www.xiaohongshu.com/explore/note-video">
          <img src="https://sns-webpic.example/video-poster.webp" />
          <span class="play-icon"><svg><use xlink:href="#play-s"></use></svg></span>
        </a>
        <a class="title" href="https://www.xiaohongshu.com/explore/note-video">竖屏视频笔记</a>
        <a class="author"><span class="name">视频作者</span></a>
        <span class="like-wrapper"><span class="count">10万+</span></span>
      </section>`;

    const item = parseXiaohongshuCard(document.querySelector('section')!);

    expect(item?.previewBlocks).toEqual([{
      type: 'video',
      media: {
        poster: 'https://sns-webpic.example/video-poster.webp',
        alt: '竖屏视频笔记',
        aspectRatio: 0.5625,
      },
    }]);
    expect(item?.metrics).toEqual([{ kind: 'reactions', value: 100000, label: '喜欢' }]);
  });

  it('keeps title-only fallback cards and rejects empty cards', () => {
    document.body.innerHTML = `
      <section id="fallback" class="note-item" data-note-id="product-note">
        <a class="title" href="https://www.xiaohongshu.com/goods-detail/example">商品笔记</a>
      </section>
      <section id="empty" class="note-item"></section>`;

    const fallback = parseXiaohongshuCard(document.querySelector('#fallback')!);
    expect(fallback).toMatchObject({
      id: 'xiaohongshu_product-note',
      title: '商品笔记',
      originalUrl: 'https://www.xiaohongshu.com/goods-detail/example',
      previewBlocks: [],
      metrics: [],
    });
    expect(fallback?.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'bookmark', fallback: 'openOriginal' }),
      expect.objectContaining({ id: 'open' }),
    ]));
    expect(parseXiaohongshuCard(document.querySelector('#empty')!)).toBeNull();
  });
});

describe('triggerXiaohongshuAction', () => {
  it('proxies likes and lets unsupported actions fall back to the original note', () => {
    document.body.innerHTML = `
      <section><span class="like-wrapper"><span class="count">8</span></span></section>`;
    const element = document.querySelector('section')!;
    const control = document.querySelector<HTMLElement>('.like-wrapper')!;
    const click = vi.spyOn(control, 'click');

    expect(triggerXiaohongshuAction(element, 'react')).toBe(true);
    expect(click).toHaveBeenCalledOnce();
    expect(triggerXiaohongshuAction(element, 'bookmark')).toBe(false);
  });
});

describe('XiaohongshuAdapter', () => {
  it('rescans infinite-feed updates and clears runtime action targets on disconnect', async () => {
    document.body.innerHTML = `
      <section class="note-item" data-note-id="first">
        <a class="title" href="/explore/first">第一条笔记</a>
      </section>`;
    const onItems = vi.fn();
    const adapter = new XiaohongshuAdapter(onItems);

    adapter.init();
    expect(onItems).toHaveBeenLastCalledWith([
      expect.objectContaining({ id: 'xiaohongshu_first' }),
    ]);

    document.body.insertAdjacentHTML('beforeend', `
      <section class="note-item" data-note-id="second">
        <a class="title" href="/explore/second">无限流新增笔记</a>
      </section>`);
    await vi.waitFor(() => expect(onItems).toHaveBeenLastCalledWith([
      expect.objectContaining({ id: 'xiaohongshu_first' }),
      expect.objectContaining({ id: 'xiaohongshu_second' }),
    ]));

    adapter.disconnect();
    expect(adapter.triggerAction('xiaohongshu_first', 'react')).toBe(false);
  });
});
