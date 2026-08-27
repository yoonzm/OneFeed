import { describe, expect, it, vi } from 'vitest';
import {
  TwitterAdapter,
  parseTwitterCard,
  parseTwitterCount,
  triggerTwitterAction,
} from './twitter';

describe('TwitterAdapter feed channels', () => {
  it('discovers the current X timeline tabs from the primary column', () => {
    document.body.innerHTML = `
      <main data-testid="primaryColumn">
        <div role="tablist">
          <div role="tab" aria-selected="true">For you</div>
          <div role="tab" aria-selected="false">Following</div>
        </div>
      </main>`;
    const adapter = new TwitterAdapter(vi.fn());
    adapter.init();

    expect(adapter.getFeedChannels().map(({ label, active }) => ({ label, active }))).toEqual([
      { label: 'For you', active: true },
      { label: 'Following', active: false },
    ]);
    adapter.disconnect();
  });
});

describe('parseTwitterCount', () => {
  it('parses exact, compact, and Chinese counts', () => {
    expect(parseTwitterCount('12,061 Likes. Like')).toBe(12061);
    expect(parseTwitterCount('2.9K reposts')).toBe(2900);
    expect(parseTwitterCount('2.1M views')).toBe(2100000);
    expect(parseTwitterCount('1.2万次浏览')).toBe(12000);
    expect(parseTwitterCount('Bookmark')).toBe(0);
  });
});

describe('parseTwitterCard', () => {
  it('normalizes an X post using stable semantic attributes', () => {
    document.body.innerHTML = `
      <article data-testid="tweet">
        <div data-testid="socialContext">Alice reposted</div>
        <div data-testid="Tweet-User-Avatar">
          <img src="https://pbs.twimg.com/profile_images/alice_normal.jpg" alt="" />
        </div>
        <div data-testid="User-Name">
          <a href="/alice"><span>Alice</span></a>
          <a href="/alice"><span>@alice</span></a>
          <a href="/alice/status/123456789"><time datetime="2026-08-27T03:32:54.000Z">3h</time></a>
        </div>
        <div data-testid="tweetText">First line\n<a href="/hashtag/OneFeed">#OneFeed</a><script>alert(1)</script></div>
        <div data-testid="tweetPhoto">
          <img src="https://pbs.twimg.com/media/example.jpg" alt="Example image" />
        </div>
        <div data-testid="tweetPhoto">
          <video poster="https://pbs.twimg.com/media/video.jpg" aria-label="Embedded video"></video>
          <img src="https://pbs.twimg.com/media/video.jpg" alt="" />
        </div>
        <button data-testid="reply" aria-label="45 Replies. Reply">45</button>
        <button data-testid="retweet" aria-label="5 reposts. Repost">5</button>
        <button data-testid="unlike" aria-label="50 Likes. Unlike">50</button>
        <a href="/alice/status/123456789/analytics" aria-label="5715 views. View post analytics">5.7K</a>
        <button data-testid="removeBookmark" aria-label="Remove Bookmark"></button>
      </article>`;

    const item = parseTwitterCard(
      document.querySelector('article')!,
      new URL('https://x.com/home'),
    );

    expect(item).toMatchObject({
      id: 'twitter_123456789',
      platform: 'twitter',
      kind: 'post',
      role: 'post',
      originalUrl: 'https://x.com/alice/status/123456789',
      author: {
        name: 'Alice',
        avatar: 'https://pbs.twimg.com/profile_images/alice_normal.jpg',
        link: 'https://x.com/alice',
      },
      context: { reason: { type: 'repost', label: 'Alice reposted' } },
      publishedAt: '2026-08-27T03:32:54.000Z',
      metrics: [
        { kind: 'replies', value: 45 },
        { kind: 'reposts', value: 5 },
        { kind: 'reactions', value: 50 },
        { kind: 'views', value: 5715 },
      ],
    });
    expect(item?.previewBlocks).toEqual([
      {
        type: 'richText',
        html: 'First line<br><a href="https://x.com/hashtag/OneFeed" target="_blank" rel="noreferrer">#OneFeed</a>',
        plainText: 'First line\n#OneFeed',
      },
      {
        type: 'gallery',
        items: [{ url: 'https://pbs.twimg.com/media/example.jpg', alt: 'Example image' }],
      },
      {
        type: 'video',
        media: { poster: 'https://pbs.twimg.com/media/video.jpg', alt: 'Embedded video' },
      },
    ]);
    expect(item?.actions.map((action) => [action.id, action.active])).toEqual([
      ['reply', undefined],
      ['repost', false],
      ['like', true],
      ['bookmark', true],
      ['open', undefined],
    ]);
    expect(item?.previewBlocks[0]).not.toHaveProperty('html', expect.stringContaining('<script'));
  });

  it('normalizes an external link preview', () => {
    document.body.innerHTML = `
      <article data-testid="tweet">
        <div data-testid="User-Name"><a href="/reader">Reader</a></div>
        <a href="/reader/status/42"><time datetime="2026-08-27T08:00:00.000Z">1h</time></a>
        <div data-testid="tweetText">A useful link</div>
        <a href="https://example.com/article">
          <div data-testid="card.wrapper">
            <img src="https://example.com/cover.jpg" alt="" />
            <span>Example article</span>
          </div>
        </a>
      </article>`;

    expect(parseTwitterCard(document.querySelector('article')!, new URL('https://x.com/home')))
      .toMatchObject({
        previewBlocks: [
          { type: 'richText', plainText: 'A useful link' },
          {
            type: 'linkPreview',
            preview: {
              url: 'https://example.com/article',
              title: 'Example article',
              image: 'https://example.com/cover.jpg',
            },
          },
        ],
      });
  });

  it('ignores promoted cards without a timestamp permalink', () => {
    document.body.innerHTML = `
      <article data-testid="tweet">
        <div data-testid="User-Name"><a href="/promoted">Promoted</a></div>
        <div data-testid="tweetText">Sponsored content</div>
        <a href="/promoted/status/42/analytics">Analytics</a>
      </article>`;

    expect(parseTwitterCard(document.querySelector('article')!, new URL('https://x.com/home')))
      .toBeNull();
  });
});

describe('triggerTwitterAction', () => {
  it('proxies stable native controls and ignores unknown actions', () => {
    document.body.innerHTML = `
      <article data-testid="tweet">
        <button data-testid="reply">Reply</button>
        <button data-testid="retweet">Repost</button>
        <button data-testid="like">Like</button>
      </article>`;
    const buttons = Array.from(document.querySelectorAll('button'));
    const replyClick = vi.spyOn(buttons[0]!, 'click');
    const repostClick = vi.spyOn(buttons[1]!, 'click');
    const likeClick = vi.spyOn(buttons[2]!, 'click');
    const element = document.querySelector('article')!;

    expect(triggerTwitterAction(element, 'like')).toBe(true);
    expect(likeClick).toHaveBeenCalledOnce();
    expect(triggerTwitterAction(element, 'reply')).toBe(false);
    expect(triggerTwitterAction(element, 'repost')).toBe(false);
    expect(replyClick).not.toHaveBeenCalled();
    expect(repostClick).not.toHaveBeenCalled();
    expect(triggerTwitterAction(element, 'share')).toBe(false);
  });
});
