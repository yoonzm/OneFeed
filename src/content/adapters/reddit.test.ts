import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  isRedditFeedUrl,
  parseRedditCard,
  parseRedditCount,
  RedditAdapter,
  triggerRedditAction,
} from './reddit';

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

function renderPost(
  attributes: Record<string, string> = {},
  content = '',
): HTMLElement {
  const post = document.createElement('shreddit-post');
  Object.entries({
    id: 't3_abc123',
    permalink: '/r/typescript/comments/abc123/a_representative_post/',
    'post-title': 'A representative post',
    'post-type': 'text',
    author: 'alice',
    icon: 'https://styles.redditmedia.com/alice.png',
    score: '1.2k',
    'comment-count': '34',
    'created-timestamp': '2026-08-12T10:00:00.000+0000',
    'subreddit-id': 't5_typescript',
    'subreddit-name': 'typescript',
    'subreddit-prefixed-name': 'r/typescript',
    feedindex: '4',
    ...attributes,
  }).forEach(([name, value]) => post.setAttribute(name, value));
  post.innerHTML = content;
  document.body.appendChild(post);
  return post;
}

describe('parseRedditCount', () => {
  it('parses compact scores and comment counts', () => {
    expect(parseRedditCount('1.2k')).toBe(1200);
    expect(parseRedditCount('2,345 comments')).toBe(2345);
    expect(parseRedditCount('Vote')).toBe(0);
  });
});

describe('isRedditFeedUrl', () => {
  it('matches home and community feeds without taking over post details', () => {
    expect(isRedditFeedUrl(new URL('https://www.reddit.com/'))).toBe(true);
    expect(isRedditFeedUrl(new URL('https://www.reddit.com/hot/'))).toBe(true);
    expect(isRedditFeedUrl(new URL('https://www.reddit.com/r/typescript/'))).toBe(true);
    expect(isRedditFeedUrl(new URL('https://www.reddit.com/r/typescript/top/'))).toBe(true);
    expect(isRedditFeedUrl(
      new URL('https://www.reddit.com/r/typescript/comments/abc123/post/'),
    )).toBe(false);
    expect(isRedditFeedUrl(new URL('https://old.reddit.com/'))).toBe(false);
    expect(isRedditFeedUrl(new URL('https://www.reddit.com.example.com/'))).toBe(false);
  });
});

describe('parseRedditCard', () => {
  it('normalizes a text post, sanitizes its body, and preserves community context', () => {
    const post = renderPost(
      { 'recommendation-source': 'user_to_post', 'is-spoiler': '', stickied: '' },
      `
        <a slot="title" href="/r/typescript/comments/abc123/a_representative_post/">
          A representative post
        </a>
        <shreddit-post-text-body slot="text-body">
          <div property="schema:articleBody" class="md">
            <p>Hello <strong>Reddit</strong><script>unsafe()</script></p>
            <p><a href="/r/typescript/" class="source-link">Visit community</a></p>
            <p><img alt=":wave:" src="https://example.com/emoji.png"></p>
          </div>
        </shreddit-post-text-body>
        <shreddit-post-flair slot="post-flair">News</shreddit-post-flair>
      `,
    );
    const shadow = post.attachShadow({ mode: 'open' });
    shadow.innerHTML = '<button data-action-bar-action="upvote" aria-pressed="true"></button>';

    const item = parseRedditCard(post, new URL('https://www.reddit.com/'));

    expect(item).toMatchObject({
      id: 'reddit_abc123',
      platform: 'reddit',
      source: { id: 'reddit', name: 'Reddit' },
      originalUrl: 'https://www.reddit.com/r/typescript/comments/abc123/a_representative_post/',
      kind: 'discussion',
      role: 'topic',
      title: 'A representative post',
      author: {
        name: 'alice',
        avatar: 'https://styles.redditmedia.com/alice.png',
        link: 'https://www.reddit.com/user/alice/',
      },
      sequence: 5,
      context: {
        community: {
          id: 'typescript',
          name: 'r/typescript',
          url: 'https://www.reddit.com/r/typescript/',
        },
        reason: { type: 'recommended', label: '推荐' },
        tags: [{ name: 'News' }],
      },
      publishedAt: '2026-08-12T10:00:00.000+0000',
      metrics: [{ kind: 'score', value: 1200, label: '分数' }],
      flags: { sensitive: false, spoiler: true, locked: false, pinned: true },
    });
    expect(item?.previewBlocks).toEqual([
      expect.objectContaining({
        type: 'richText',
        plainText: 'Hello Reddit Visit community :wave:',
      }),
    ]);
    const richText = item?.previewBlocks[0];
    expect(richText?.type).toBe('richText');
    if (richText?.type === 'richText') {
      expect(richText.html).toContain('href="https://www.reddit.com/r/typescript/"');
      expect(richText.html).not.toContain('<script');
      expect(richText.html).not.toContain('class=');
    }
    expect(item?.actions).toEqual([
      expect.objectContaining({ id: 'react', variant: 'upvote', active: true }),
      expect.objectContaining({ id: 'reply', count: 34 }),
      expect.objectContaining({ id: 'open', kind: 'open' }),
    ]);
  });

  it('extracts primary images with their dimensions', () => {
    const post = renderPost(
      { 'post-type': 'image', 'content-href': 'https://i.redd.it/image.png' },
      `
        <div slot="post-media-container">
          <img role="presentation" src="https://preview.redd.it/background.png">
          <img data-post-media-primary src="https://preview.redd.it/image.png"
            alt="Post preview" width="640" height="480">
        </div>
      `,
    );

    expect(parseRedditCard(post, new URL('https://www.reddit.com/'))?.previewBlocks)
      .toEqual([{
        type: 'gallery',
        items: [{
          url: 'https://preview.redd.it/image.png',
          alt: 'Post preview',
          width: 640,
          height: 480,
          aspectRatio: 4 / 3,
        }],
      }]);
  });

  it('normalizes video posters and external link previews', () => {
    const videoPost = renderPost(
      { id: 't3_video', 'post-type': 'video' },
      '<div slot="post-media-container"><shreddit-player poster="https://preview.redd.it/video.jpg" duration="42"></shreddit-player></div>',
    );
    const linkPost = renderPost(
      {
        id: 't3_link',
        'post-type': 'link',
        'content-href': 'https://example.com/story',
        domain: 'example.com',
      },
      '<div slot="thumbnail"><img src="https://example.com/thumbnail.jpg"></div>',
    );

    expect(parseRedditCard(videoPost, new URL('https://www.reddit.com/'))?.previewBlocks)
      .toEqual([{
        type: 'video',
        media: {
          poster: 'https://preview.redd.it/video.jpg',
          alt: 'A representative post',
          url: undefined,
          durationSeconds: 42,
        },
      }]);
    expect(parseRedditCard(linkPost, new URL('https://www.reddit.com/'))?.previewBlocks)
      .toEqual([{
        type: 'linkPreview',
        preview: {
          url: 'https://example.com/story',
          image: 'https://example.com/thumbnail.jpg',
          siteName: 'example.com',
        },
      }]);
  });

  it('ignores malformed cards without a stable post id', () => {
    const post = renderPost({ id: '', permalink: '' });
    expect(parseRedditCard(post, new URL('https://www.reddit.com/'))).toBeNull();
  });
});

describe('triggerRedditAction', () => {
  it('proxies upvotes and comment navigation through the original shadow controls', () => {
    const post = renderPost();
    const shadow = post.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <button data-action-bar-action="upvote" type="button">Upvote</button>
      <a data-action-bar-action="comments" href="/r/typescript/comments/abc123/post/">Comments</a>
    `;
    const upvote = shadow.querySelector<HTMLButtonElement>('button')!;
    const comments = shadow.querySelector<HTMLAnchorElement>('a')!;
    const upvoteClick = vi.spyOn(upvote, 'click').mockImplementation(() => undefined);
    const commentsClick = vi.spyOn(comments, 'click').mockImplementation(() => undefined);

    expect(triggerRedditAction(post, 'react')).toBe(true);
    expect(triggerRedditAction(post, 'reply')).toBe(true);
    expect(triggerRedditAction(post, 'share')).toBe(false);
    expect(upvoteClick).toHaveBeenCalledOnce();
    expect(commentsClick).toHaveBeenCalledOnce();
  });
});

describe('RedditAdapter updates', () => {
  it('rescans cards appended by Reddit infinite scrolling', async () => {
    renderPost();
    const onItems = vi.fn();
    const adapter = new RedditAdapter(onItems);
    adapter.init();

    renderPost({ id: 't3_second', permalink: '/r/typescript/comments/second/post/' });
    await new Promise((resolve) => window.setTimeout(resolve, 180));

    expect(onItems).toHaveBeenLastCalledWith([
      expect.objectContaining({ id: 'reddit_abc123' }),
      expect.objectContaining({ id: 'reddit_second' }),
    ]);
    adapter.disconnect();
  });
});
