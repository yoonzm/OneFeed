import { describe, expect, it, vi } from 'vitest';
import {
  isV2exThreadUrl,
  parseV2exThread,
  V2exThreadAdapter,
} from './v2exThread';

function fixture(): void {
  document.body.innerHTML = `
    <div id="Main">
      <div class="box">
        <div class="header">
          <a href="/member/alice"><img class="avatar" src="https://cdn.v2ex.com/alice.png" alt="alice" /></a>
          <a href="/go/programmer">程序员</a>
          <h1>怎样设计一个稳定的扩展？</h1>
          <div class="votes"><a class="vote">9</a></div>
          <small class="gray">
            <a href="/member/alice">Alice</a> ·
            <span title="2026-08-10 10:09:31 +08:00">刚刚</span> · 7,215 views
          </small>
        </div>
        <div class="cell"><div class="topic_content"><div class="markdown_body">
          <p style="color:red">主题正文。<script>alert(1)</script></p>
          <img src="https://pic.example/topic.png" alt="主题图片" />
        </div></div></div>
      </div>
      <div class="box">
        <div class="cell">
          <a class="tag" href="/tag/browser">浏览器</a>
          <span class="gray">101 replies</span>
        </div>
        <div class="cell ps_container">
          <a class="page_current">2</a>
          <input class="page_input" max="3" />
        </div>
        <div id="r_9001" class="cell">
          <img class="avatar" src="https://cdn.v2ex.com/bob.png" alt="bob" />
          <span class="no">101</span>
          <a class="dark" href="/member/bob">Bob</a>
          <span class="ago" title="2026-08-10 11:00:00 +08:00">1 分钟前</span>
          <span class="small fade">❤️ 4</span>
          <div class="reply_content"><p>第一条回复。</p></div>
        </div>
        <div id="r_9002" class="cell">
          <img class="avatar" src="https://cdn.v2ex.com/carol.png" alt="carol" />
          <span class="no">102</span>
          <a class="dark" href="/member/carol">Carol</a>
          <span class="ago" title="2026-08-10 11:01:00 +08:00">刚刚</span>
          <div class="reply_content">第二条回复。</div>
        </div>
      </div>
    </div>`;
}

describe('V2EX topic thread', () => {
  it('matches topic details without matching list routes', () => {
    expect(isV2exThreadUrl(new URL('https://www.v2ex.com/t/123'))).toBe(true);
    expect(isV2exThreadUrl(new URL('https://v2ex.com/t/123/?p=2'))).toBe(true);
    expect(isV2exThreadUrl(new URL('https://www.v2ex.com/recent'))).toBe(false);
  });

  it('parses the topic, replies and pagination as one thread', () => {
    fixture();
    const thread = parseV2exThread(
      document,
      new URL('https://www.v2ex.com/t/123?p=2'),
    );

    expect(thread).toMatchObject({
      id: 'v2ex_topic_123',
      kind: 'thread',
      entryLabel: '回复',
      loadingMode: 'paged',
      header: {
        role: 'topic',
        title: '怎样设计一个稳定的扩展？',
        author: { name: 'Alice' },
        context: {
          community: { name: '程序员' },
          tags: [{ name: '浏览器' }],
        },
        metrics: [
          { kind: 'reactions', value: 9, label: '赞同' },
          { kind: 'replies', value: 101, label: '回复' },
          { kind: 'views', value: 7215, label: '浏览' },
        ],
      },
      pagination: { currentPage: 2, totalPages: 3 },
    });
    expect(thread?.header.body[0]).toMatchObject({
      type: 'richText',
      plainText: '主题正文。',
    });
    expect(thread?.header.body[1]).toMatchObject({
      type: 'gallery',
      items: [{ url: 'https://pic.example/topic.png', alt: '主题图片' }],
    });
    expect(thread?.pagination?.previousUrl).toBe('https://www.v2ex.com/t/123?p=1');
    expect(thread?.pagination?.nextUrl).toBe('https://www.v2ex.com/t/123?p=3');
    expect(thread?.entries).toMatchObject([
      {
        id: 'v2ex_reply_9001',
        role: 'reply',
        kind: 'post',
        sequence: 101,
        author: { name: 'Bob' },
        metrics: [{ kind: 'reactions', value: 4, label: '喜欢' }],
      },
      {
        id: 'v2ex_reply_9002',
        role: 'reply',
        sequence: 102,
        author: { name: 'Carol' },
      },
    ]);
    expect(thread?.entries.every((entry) => entry.actions.length === 0)).toBe(true);
  });

  it('proxies the topic vote from the thread header', () => {
    fixture();
    const vote = document.querySelector<HTMLElement>('.votes .vote')!;
    const click = vi.spyOn(vote, 'click');
    const onDetail = vi.fn();
    const adapter = new V2exThreadAdapter(onDetail);
    window.history.replaceState({}, '', '/t/123?p=2');

    adapter.init();

    expect(onDetail).toHaveBeenCalledOnce();
    expect(adapter.triggerAction('v2ex_topic_123', 'react')).toBe(true);
    expect(click).toHaveBeenCalledOnce();
    adapter.disconnect();
  });
});
