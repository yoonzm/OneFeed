import { describe, expect, it, vi } from 'vitest';
import {
  isZhihuThreadUrl,
  parseZhihuThread,
  ZhihuThreadAdapter,
} from './zhihuThread';

describe('Zhihu question thread', () => {
  it('matches question roots without taking over answer permalinks', () => {
    expect(isZhihuThreadUrl(new URL('https://www.zhihu.com/question/1'))).toBe(true);
    expect(isZhihuThreadUrl(new URL('https://zhihu.com/question/1/'))).toBe(true);
    expect(isZhihuThreadUrl(new URL('https://www.zhihu.com/question/1/answer/42'))).toBe(false);
  });

  it('separates the question header from answer entries', () => {
    document.body.innerHTML = `
      <header class="QuestionHeader">
        <h1 class="QuestionHeader-title">如何保持专注？</h1>
        <div class="QuestionHeader-detail">
          <div class="RichText"><p style="color:red">问题补充。<script>alert(1)</script></p></div>
        </div>
      </header>
      <div class="List-headerText">2 个回答</div>
      <div class="List-item">
        <article class="AnswerItem" data-zop='{"type":"answer","itemId":"42","authorName":"林一","title":"如何保持专注？","dateCreated":"2026-08-01T10:00:00Z"}'>
          <a href="/question/1/answer/42">发布于今天</a>
          <div class="RichContent-inner"><p>${'长回答。'.repeat(100)}</p></div>
          <button class="VoteButton" aria-label="赞同 12">赞同 12</button>
          <button class="ContentItem-action">3 条评论</button>
        </article>
      </div>
      <div class="List-item">
        <article class="AnswerItem" data-zop='{"type":"answer","itemId":"43","authorName":"周二","title":"如何保持专注？"}'>
          <meta itemprop="dateCreated" content="2026-08-02T11:00:00Z" />
          <meta itemprop="dateModified" content="2026-08-03T12:00:00Z" />
          <a href="/question/1/answer/43">发布于昨天</a>
          <div class="RichContent-inner"><p>第二个回答。</p></div>
          <button class="ContentItem-action">0 条评论</button>
        </article>
      </div>`;

    const thread = parseZhihuThread(
      document,
      new URL('https://www.zhihu.com/question/1'),
    );

    expect(thread).toMatchObject({
      id: 'zhihu_question_1',
      kind: 'thread',
      entryLabel: '回答',
      loadingMode: 'infinite',
      header: {
        role: 'question',
        title: '如何保持专注？',
        metrics: [{ kind: 'replies', value: 2, label: '回答' }],
      },
    });
    expect(thread?.header.body[0]).toMatchObject({
      type: 'richText',
      plainText: '问题补充。',
    });
    expect(thread?.header.body[0]).not.toMatchObject({ html: expect.stringContaining('script') });
    expect(thread?.entries).toHaveLength(2);
    expect(thread?.entries[0]).toMatchObject({
      id: 'zhihu_42',
      role: 'answer',
      kind: 'article',
      author: { name: '林一' },
      publishedAt: '2026-08-01T10:00:00Z',
    });
    expect(thread?.entries[0]).not.toHaveProperty('title');
    expect(thread?.entries[0]?.body[0]).toMatchObject({ type: 'richText' });
    expect(thread?.entries[0]).not.toHaveProperty('previewBlocks');
    expect(thread?.entries[1]).toMatchObject({
      publishedAt: '2026-08-02T11:00:00Z',
      updatedAt: '2026-08-03T12:00:00Z',
    });
    expect(thread?.entries[0]?.actions.find((action) => action.kind === 'reply')).toMatchObject({
      enabled: false,
    });
    expect(thread?.entries[0]?.actions.find((action) => action.kind === 'open')).toMatchObject({
      label: '查看回答',
    });
  });

  it('proxies answer reactions through the matching runtime element', () => {
    document.body.innerHTML = `
      <h1 class="QuestionHeader-title">如何保持专注？</h1>
      <div class="List-item">
        <article class="AnswerItem" data-zop='{"type":"answer","itemId":"42"}'>
          <a href="/question/1/answer/42">发布时间</a>
          <div class="RichContent-inner"><p>回答。</p></div>
          <button class="VoteButton">赞同</button>
        </article>
      </div>`;
    const vote = document.querySelector('button')!;
    const click = vi.spyOn(vote, 'click');
    const onDetail = vi.fn();
    const adapter = new ZhihuThreadAdapter(onDetail);
    window.history.replaceState({}, '', '/question/1');

    adapter.init();

    expect(onDetail).toHaveBeenCalledOnce();
    expect(adapter.triggerAction('zhihu_42', 'react')).toBe(true);
    expect(click).toHaveBeenCalledOnce();
    adapter.disconnect();
  });

  it('keeps the existing question-detail projection for interleaved images', () => {
    document.body.innerHTML = `
      <h1 class="QuestionHeader-title">如何组织图文回答？</h1>
      <div class="List-item">
        <article class="AnswerItem" data-zop='{"type":"answer","itemId":"42"}'>
          <a href="/question/1/answer/42">发布时间</a>
          <div class="RichContent-inner">
            <p>图片前。</p>
            <img src="https://pic.example/thread.jpg" alt="问题详情配图" />
            <p>图片后。</p>
          </div>
        </article>
      </div>`;

    const thread = parseZhihuThread(
      document,
      new URL('https://www.zhihu.com/question/1'),
    );

    expect(thread?.entries[0]?.body.map((block) => block.type)).toEqual([
      'richText',
      'gallery',
    ]);
    expect(thread?.entries[0]?.body[0]).toMatchObject({ type: 'richText' });
    const firstBlock = thread?.entries[0]?.body[0];
    expect(firstBlock?.type === 'richText'
      ? firstBlock.plainText.replace(/\s+/g, '')
      : '').toBe('图片前。图片后。');
  });
});
