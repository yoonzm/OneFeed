import { describe, expect, it, vi } from 'vitest';
import {
  findZhihuDetailRoot,
  isZhihuDetailUrl,
  parseZhihuDetail,
  ZhihuDetailAdapter,
} from './zhihuDetail';

describe('isZhihuDetailUrl', () => {
  it('matches answer and article details without matching question pages', () => {
    expect(isZhihuDetailUrl(new URL('https://www.zhihu.com/question/1/answer/42'))).toBe(true);
    expect(isZhihuDetailUrl(new URL('https://zhuanlan.zhihu.com/p/123/?utm_source=test'))).toBe(true);
    expect(isZhihuDetailUrl(new URL('https://www.zhihu.com/question/1'))).toBe(false);
    expect(isZhihuDetailUrl(new URL('https://zhuanlan.zhihu.com/question/1/answer/42'))).toBe(false);
    expect(isZhihuDetailUrl(new URL('https://zhihu.com.example.com/question/1/answer/42'))).toBe(false);
  });
});

describe('Zhihu answer detail', () => {
  it('selects the answer from the URL instead of the first answer on the page', () => {
    document.body.innerHTML = `
      <h1 class="QuestionHeader-title">如何保持专注？</h1>
      <article class="ContentItem AnswerItem" data-zop='{"type":"answer","itemId":"7"}'>
        <div class="RichContent-inner"><p>其他回答。</p></div>
      </article>
      <article
        class="ContentItem AnswerItem"
        data-zop='{"type":"answer","itemId":"42","dateCreated":"2026-08-01T10:00:00Z","dateModified":"2026-08-02T10:00:00Z","upvoteCount":12000,"commentCount":18}'
      >
        <a class="UserLink-link" href="/people/reader">林一</a>
        <img class="Avatar" src="https://pic.example/avatar.png" />
        <div class="RichContent-inner">
          <h2>先减少输入</h2>
          <p style="color:red">把信息变少。<script>alert(1)</script></p>
          <img data-original="https://pic.example/answer.jpg" alt="书桌" />
        </div>
        <button class="VoteButton">赞同 1.2 万</button>
        <button class="ContentItem-action">18 条评论</button>
      </article>`;

    const url = new URL('https://www.zhihu.com/question/1/answer/42');
    const root = findZhihuDetailRoot(document, url);
    const detail = root ? parseZhihuDetail(root, url) : null;

    expect(root?.getAttribute('data-zop')).toContain('"itemId":"42"');
    expect(detail).toMatchObject({
      id: 'zhihu_42',
      kind: 'article',
      role: 'answer',
      title: '如何保持专注？',
      author: { name: '林一' },
      publishedAt: '2026-08-01T10:00:00Z',
      updatedAt: '2026-08-02T10:00:00Z',
      metrics: [
        { kind: 'reactions', value: 12000, label: '赞同' },
        { kind: 'replies', value: 18, label: '评论' },
      ],
    });
    expect(detail?.originalUrl).toBe(url.href);
    const text = detail?.body.find((block) => block.type === 'richText');
    const gallery = detail?.body.find((block) => block.type === 'gallery');
    expect(text?.html).toContain('<h2>先减少输入</h2>');
    expect(text?.html).not.toContain('script');
    expect(text?.html).not.toContain('style=');
    expect(gallery?.items).toEqual([{ url: 'https://pic.example/answer.jpg', alt: '书桌' }]);
    expect(detail?.actions.find((action) => action.kind === 'reply')?.enabled).toBe(false);
    expect(detail?.actions.some((action) => action.kind === 'open')).toBe(false);
  });

  it('returns no root when the URL answer is absent from the DOM', () => {
    document.body.innerHTML = `
      <article class="AnswerItem" data-zop='{"type":"answer","itemId":"7"}'>
        <div class="RichContent-inner"><p>其他回答。</p></div>
      </article>`;

    expect(findZhihuDetailRoot(
      document,
      new URL('https://www.zhihu.com/question/1/answer/42'),
    )).toBeNull();
  });
});

describe('Zhihu article detail', () => {
  it('parses the matched article body independently from unrelated rich text', () => {
    document.body.innerHTML = `
      <div class="RichText">页面导航文案</div>
      <h1 class="Post-Title">长期维护一个浏览器扩展</h1>
      <article
        class="Post-content"
        data-zop='{"type":"article","itemId":"123","datePublished":"2026-08-03T08:00:00Z","commentCount":5}'
      >
        <div class="Post-Author">
          <a class="AuthorInfo-name" href="/people/maintainer">维护者</a>
        </div>
        <div class="Post-RichText"><p>这是文章正文。</p></div>
      </article>`;

    const url = new URL('https://zhuanlan.zhihu.com/p/123');
    const root = findZhihuDetailRoot(document, url);
    const detail = root ? parseZhihuDetail(root, url) : null;

    expect(detail).toMatchObject({
      id: 'zhihu_123',
      role: 'article',
      title: '长期维护一个浏览器扩展',
      author: { name: '维护者' },
      publishedAt: '2026-08-03T08:00:00Z',
    });
    expect(detail?.body[0]).toMatchObject({
      type: 'richText',
      plainText: '这是文章正文。',
    });
  });

  it('does not publish stale article DOM for a new SPA URL', () => {
    document.body.innerHTML = `
      <article
        class="Post-content"
        data-zop='{"type":"article","itemId":"123"}'
      >
        <div class="Post-RichText"><p>旧文章正文。</p></div>
      </article>`;

    expect(findZhihuDetailRoot(
      document,
      new URL('https://zhuanlan.zhihu.com/p/456'),
    )).toBeNull();
  });

  it('proxies reactions only for the active detail item', () => {
    document.body.innerHTML = `
      <article class="Post-content" data-zop='{"type":"article","itemId":"123"}'>
        <div class="Post-RichText"><p>正文</p></div>
        <button class="VoteButton"></button>
      </article>`;
    const click = vi.spyOn(document.querySelector('button')!, 'click');
    const onDetail = vi.fn();
    const adapter = new ZhihuDetailAdapter(onDetail);

    window.history.replaceState({}, '', '/p/123');
    adapter.init();

    expect(onDetail).toHaveBeenCalledOnce();
    expect(adapter.triggerAction('zhihu_123', 'react')).toBe(true);
    expect(click).toHaveBeenCalledOnce();
    expect(adapter.triggerAction('zhihu_other', 'react')).toBe(false);
    adapter.disconnect();
  });
});
