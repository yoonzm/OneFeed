import { describe, expect, it, vi } from 'vitest';
import {
  isLinuxDoThreadUrl,
  LinuxDoThreadAdapter,
  parseLinuxDoThread,
} from './linuxDoThread';

function postFixture(options: {
  number: number;
  postId: number;
  author: string;
  body: string;
  reactions?: number;
}): string {
  const { number, postId, author, body, reactions = 0 } = options;
  const href = number === 1 ? '/t/topic/2735915' : `/t/topic/2735915/${number}`;
  return `
    <div class="topic-post" data-post-number="${number}">
      <article id="post_${number}" data-post-id="${postId}">
        <div class="topic-avatar">
          <img class="avatar" src="https://cdn.ldstatic.com/${author}.png" />
        </div>
        <div class="names">
          <span class="first"><a href="/u/${author}" data-user-card="${author}">${author}</a></span>
        </div>
        <a class="post-date" href="${href}">
          <span class="relative-date" data-time="1786370437${number}">刚刚</span>
        </a>
        <div class="cooked">${body}<div class="cooked-selection-barrier">忽略</div></div>
        ${reactions ? `<span class="reactions-counter">${reactions}</span>` : ''}
        <button class="btn-toggle-reaction-like" title="点赞此帖子">点赞</button>
      </article>
    </div>`;
}

function fixture(includeFirstPost = true): void {
  document.body.innerHTML = `
    <h1 data-topic-id="2735915">
      <a class="fancy-title" href="/t/topic/2735915">如何适配 Discourse 详情页？</a>
    </h1>
    <div class="topic-category">
      <a class="badge-category__wrapper" href="/c/dev/1">
        <span class="badge-category__name">开发调优</span>
      </a>
      <a class="discourse-tag" href="/tag/browser">浏览器</a>
    </div>
    <div class="topic-timeline"><div class="timeline-replies">18 / 24</div></div>
    <div class="topic-map">
      <button class="topic-map__views-trigger"><span class="number">1.2k</span></button>
      <button class="topic-map__likes-trigger"><span class="number">149</span></button>
    </div>
    ${includeFirstPost ? postFixture({
      number: 1,
      postId: 21433286,
      author: 'Alice',
      reactions: 40,
      body: `
        <p class="body" style="color:red">主题正文。<script>alert(1)</script></p>
        <img src="https://cdn.ldstatic.com/topic.webp" alt="主题图片" width="800" height="600" />
        <img class="emoji" src="https://cdn.ldstatic.com/emoji.png" alt=":smile:" />`,
    }) : ''}
    ${postFixture({
      number: 18,
      postId: 21438018,
      author: 'Bob',
      reactions: 3,
      body: '<blockquote><p>引用。</p></blockquote><p>第十八楼。</p>',
    })}`;
}

describe('Linux DO topic thread', () => {
  it('matches topic roots and numbered post permalinks', () => {
    expect(isLinuxDoThreadUrl(new URL('https://linux.do/t/topic/2735915'))).toBe(true);
    expect(isLinuxDoThreadUrl(new URL('https://linux.do/t/topic/2735915/18'))).toBe(true);
    expect(isLinuxDoThreadUrl(new URL('https://linux.do/t/2735915'))).toBe(true);
    expect(isLinuxDoThreadUrl(new URL('https://linux.do/latest'))).toBe(false);
  });

  it('normalizes the topic header, visible replies and media blocks', () => {
    fixture();

    const thread = parseLinuxDoThread(
      document,
      new URL('https://linux.do/t/topic/2735915'),
    );

    expect(thread).toMatchObject({
      id: 'linux-do_topic_2735915',
      platform: 'linux-do',
      kind: 'thread',
      entryLabel: '回复',
      loadingMode: 'infinite',
      header: {
        role: 'topic',
        title: '如何适配 Discourse 详情页？',
        author: { name: 'Alice' },
        context: {
          community: { name: '开发调优' },
          tags: [{ name: '浏览器' }],
        },
        metrics: [
          { kind: 'reactions', value: 149, label: '赞' },
          { kind: 'replies', value: 23, label: '回复' },
          { kind: 'views', value: 1200, label: '浏览' },
        ],
      },
      entries: [{
        id: 'linux-do_post_21438018',
        role: 'reply',
        sequence: 18,
        author: { name: 'Bob' },
        metrics: [{ kind: 'reactions', value: 3, label: '赞' }],
      }],
    });
    expect(thread?.header.body[0]).toMatchObject({
      type: 'richText',
      plainText: '主题正文。',
    });
    expect(thread?.header.body[0]).not.toMatchObject({
      html: expect.stringMatching(/script|style=|class=/),
    });
    expect(thread?.header.body[1]).toMatchObject({
      type: 'gallery',
      items: [{
        url: 'https://cdn.ldstatic.com/topic.webp',
        alt: '主题图片',
        width: 800,
        height: 600,
      }],
    });
    expect(thread?.entries[0]?.body[0]).toMatchObject({
      type: 'richText',
      plainText: '引用。第十八楼。',
    });
    expect(thread?.entries[0]).not.toHaveProperty('previewBlocks');
  });

  it('keeps a numbered permalink usable when Discourse virtualizes away the first post', () => {
    fixture(false);

    const thread = parseLinuxDoThread(
      document,
      new URL('https://linux.do/t/topic/2735915/18'),
    );

    expect(thread?.header).toMatchObject({
      title: '如何适配 Discourse 详情页？',
      body: [],
    });
    expect(thread?.header.author).toBeUndefined();
    expect(thread?.entries).toMatchObject([{ sequence: 18 }]);
  });

  it('proxies a reply reaction through its runtime post element', () => {
    fixture();
    const reaction = document.querySelectorAll<HTMLButtonElement>(
      '.btn-toggle-reaction-like',
    )[1]!;
    const click = vi.spyOn(reaction, 'click');
    const onDetail = vi.fn();
    const adapter = new LinuxDoThreadAdapter(onDetail);
    window.history.replaceState({}, '', '/t/topic/2735915');

    adapter.init();

    expect(onDetail).toHaveBeenCalledOnce();
    expect(adapter.triggerAction('linux-do_post_21438018', 'react')).toBe(true);
    expect(click).toHaveBeenCalledOnce();
    adapter.disconnect();
  });
});
