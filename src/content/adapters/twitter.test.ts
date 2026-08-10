import { describe, expect, it, vi } from 'vitest';
import {
  parseTwitterCard,
  parseTwitterCount,
  triggerTwitterAction,
} from './twitter';

describe('parseTwitterCount', () => {
  it('parses plain and compact X counts', () => {
    expect(parseTwitterCount('1,234 Likes. Like')).toBe(1234);
    expect(parseTwitterCount('1.2K')).toBe(1200);
    expect(parseTwitterCount('2.5万 次喜欢')).toBe(25000);
    expect(parseTwitterCount('Like')).toBe(0);
  });
});

describe('parseTwitterCard', () => {
  it('normalizes an X post and sanitizes its content', () => {
    document.body.innerHTML = `
      <article data-testid="tweet">
        <div data-testid="User-Name">
          <a href="/reader"><span>林一</span></a>
          <a href="/reader"><span>@reader</span></a>
        </div>
        <div data-testid="Tweet-User-Avatar">
          <img src="https://pbs.twimg.com/profile_images/avatar.jpg" />
        </div>
        <a href="https://x.com/reader/status/123456789">
          <time datetime="2026-08-06T01:02:03.000Z">1h</time>
        </a>
        <div data-testid="tweetText">
          <span style="color:red">保持专注</span>
          <a href="https://example.com/article">阅读全文</a>
          <script>alert(1)</script>
        </div>
        <div data-testid="tweetPhoto">
          <img src="https://pbs.twimg.com/media/example.jpg" alt="示例图片" />
        </div>
        <button data-testid="like" aria-label="1.2K Likes. Like"></button>
        <button data-testid="reply" aria-label="34 Replies. Reply"></button>
      </article>`;

    const item = parseTwitterCard(document.querySelector('article')!);

    expect(item).toMatchObject({
      id: 'twitter_123456789',
      platform: 'twitter',
      originalUrl: 'https://x.com/reader/status/123456789',
      author: {
        name: '林一',
        avatar: 'https://pbs.twimg.com/profile_images/avatar.jpg',
      },
      kind: 'post',
      publishedAt: '2026-08-06T01:02:03.000Z',
      metrics: [
        { kind: 'reactions', value: 1200, label: '喜欢' },
        { kind: 'replies', value: 34, label: '回复' },
      ],
    });
    const text = item?.previewBlocks.find((block) => block.type === 'richText');
    const gallery = item?.previewBlocks.find((block) => block.type === 'gallery');
    expect(text?.html).toContain('保持专注');
    expect(text?.html).not.toContain('script');
    expect(text?.html).not.toContain('style=');
    expect(gallery?.items).toEqual([{
      url: 'https://pbs.twimg.com/media/example.jpg',
      alt: '示例图片',
    }]);
    expect(item?.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'react', variant: 'like', count: 1200 }),
      expect.objectContaining({ id: 'reply', count: 34 }),
    ]));
    expect(item).not.toHaveProperty('rawElementRef');
  });

  it('keeps image-only posts and rejects empty cards', () => {
    document.body.innerHTML = `
      <article id="with-image" data-testid="tweet">
        <div data-testid="tweetPhoto"><img src="https://pbs.twimg.com/media/image.jpg" /></div>
      </article>
      <article id="empty" data-testid="tweet"></article>`;

    expect(parseTwitterCard(document.querySelector('#with-image')!)).not.toBeNull();
    expect(parseTwitterCard(document.querySelector('#empty')!)).toBeNull();
  });
});

describe('triggerTwitterAction', () => {
  it('proxies supported actions to the original post', () => {
    document.body.innerHTML = '<article><button data-testid="like"></button></article>';
    const button = document.querySelector('button') as HTMLButtonElement;
    const click = vi.spyOn(button, 'click');
    const element = document.querySelector('article')!;

    expect(triggerTwitterAction(element, 'react')).toBe(true);
    expect(click).toHaveBeenCalledOnce();
    expect(triggerTwitterAction(element, 'reply')).toBe(false);
  });
});
