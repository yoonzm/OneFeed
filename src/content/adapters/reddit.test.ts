import { describe, expect, it, vi } from 'vitest';
import { RedditAdapter, parseRedditCard, parseRedditCount } from './reddit';

function redditPost(id: string, title = 'A useful discussion'): string {
  return `
    <shreddit-post
      id="t3_${id}"
      permalink="/r/typescript/comments/${id}/a_useful_discussion/"
      post-title="${title}"
      post-type="text"
      author="reader"
      icon="/avatar.png"
      subreddit-id="t5_typescript"
      subreddit-name="typescript"
      subreddit-prefixed-name="r/typescript"
      created-timestamp="2026-08-27T08:00:00.000000+0000"
      score="1.2K"
      comment-count="34"
      recommendation-source="user_to_post"
      nsfw
    >
      <span slot="credit-bar">
        <div id="${id}-post-rtjson-content">Because you visited this community</div>
      </span>
      <shreddit-post-flair>TypeScript</shreddit-post-flair>
      <shreddit-post-text-body slot="text-body">
        <div id="${id}-post-rtjson-content">
          <p>First line <a href="/r/typescript/">community</a></p>
          <font class="immersive-translate-target-wrapper" style="display: none;">重复译文</font>
          <script>alert(1)</script>
        </div>
      </shreddit-post-text-body>
      <div slot="post-media-container">
        <img src="/preview.jpg" alt="Preview" width="640" height="360" />
      </div>
    </shreddit-post>`;
}

describe('parseRedditCount', () => {
  it('parses exact and compact Reddit counts', () => {
    expect(parseRedditCount('1,234')).toBe(1234);
    expect(parseRedditCount('2.5K')).toBe(2500);
    expect(parseRedditCount('-3')).toBe(-3);
  });
});

describe('parseRedditCard', () => {
  it('normalizes semantic shreddit-post attributes and preview content', () => {
    document.body.innerHTML = redditPost('abc123');

    const item = parseRedditCard(
      document.querySelector('shreddit-post')!,
      new URL('https://www.reddit.com/'),
    );

    expect(item).toMatchObject({
      id: 'reddit_abc123',
      platform: 'reddit',
      originalUrl: 'https://www.reddit.com/r/typescript/comments/abc123/a_useful_discussion/',
      kind: 'discussion',
      role: 'topic',
      title: 'A useful discussion',
      author: {
        name: 'reader',
        avatar: 'https://www.reddit.com/avatar.png',
        link: 'https://www.reddit.com/user/reader/',
      },
      context: {
        community: {
          id: 't5_typescript',
          name: 'r/typescript',
          url: 'https://www.reddit.com/r/typescript/',
        },
        reason: {
          type: 'recommended',
          label: 'Because you visited this community',
        },
        tags: [{ name: 'TypeScript' }],
      },
      publishedAt: '2026-08-27T08:00:00.000000+0000',
      metrics: [
        { kind: 'score', value: 1200 },
        { kind: 'replies', value: 34 },
      ],
      flags: { sensitive: true, spoiler: false, pinned: false },
    });
    expect(item?.previewBlocks).toEqual([
      {
        type: 'richText',
        html: '<p>First line <a href="https://www.reddit.com/r/typescript/" target="_blank" rel="noreferrer">community</a></p>',
        plainText: 'First line community',
      },
      {
        type: 'gallery',
        items: [{
          url: 'https://www.reddit.com/preview.jpg',
          alt: 'Preview',
          width: 640,
          height: 360,
        }],
      },
    ]);
    expect(item?.previewBlocks[0]?.type === 'richText' ? item.previewBlocks[0].html : '')
      .not.toContain('<script');
  });

  it('ignores promoted cards and nodes without a post permalink', () => {
    document.body.innerHTML = `${redditPost('promoted')}<shreddit-post id="t3_missing"></shreddit-post>`;
    const posts = document.querySelectorAll('shreddit-post');
    posts[0]?.setAttribute('promoted', '');

    expect(parseRedditCard(posts[0]!, new URL('https://www.reddit.com/'))).toBeNull();
    expect(parseRedditCard(posts[1]!, new URL('https://www.reddit.com/'))).toBeNull();
  });
});

describe('RedditAdapter', () => {
  it('rescans semantic post nodes added by the infinite feed', async () => {
    document.body.innerHTML = redditPost('first');
    const onItems = vi.fn();
    const adapter = new RedditAdapter(onItems);
    adapter.init();

    document.body.insertAdjacentHTML('beforeend', redditPost('second', 'Second discussion'));
    await new Promise((resolve) => window.setTimeout(resolve, 180));

    expect(onItems).toHaveBeenLastCalledWith([
      expect.objectContaining({ id: 'reddit_first' }),
      expect.objectContaining({ id: 'reddit_second' }),
    ]);
    adapter.disconnect();
  });
});
