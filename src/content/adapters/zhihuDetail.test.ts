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
      <div class="QuestionRichText">
        <div class="RichContent-inner">
          <p style="color:red">先明确要解决的问题。<script>alert(1)</script></p>
        </div>
      </div>
      <a href="/question/1">查看全部 2 个回答</a>
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
        <button class="ContentItem-action" aria-label="收藏 8">收藏</button>
        <button class="ContentItem-action" aria-label="喜欢 6">喜欢</button>
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
      actionSlots: {
        author: {
          metrics: [
            { kind: 'reactions', value: 12000, label: '赞同' },
            { kind: 'replies', value: 18, label: '评论' },
          ],
        },
      },
    });
    expect(detail?.originalUrl).toBe(url.href);
    expect(detail?.context).toMatchObject({
      body: [{ type: 'richText', plainText: '先明确要解决的问题。' }],
      navigation: {
        label: '查看全部 2 个回答',
        url: 'https://www.zhihu.com/question/1',
      },
    });
    expect(detail?.context?.body[0]).not.toMatchObject({
      html: expect.stringContaining('script'),
    });
    const text = detail?.body.find((block) => block.type === 'richText');
    const gallery = detail?.body.find((block) => block.type === 'gallery');
    expect(text?.html).toContain('<h2>先减少输入</h2>');
    expect(text?.html).not.toContain('script');
    expect(text?.html).not.toContain('style=');
    expect(gallery?.items).toEqual([{ url: 'https://pic.example/answer.jpg', alt: '书桌' }]);
    expect(detail?.actionSlots?.author?.actions.find(
      (action) => action.kind === 'reply',
    )?.enabled).toBe(true);
    expect(detail?.actionSlots?.author?.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'react', label: '赞同', count: 12000 }),
      expect.objectContaining({ id: 'reply', label: '评论', count: 18 }),
      expect.objectContaining({ id: 'bookmark', label: '收藏', count: 8 }),
      expect.objectContaining({ id: 'like', label: '喜欢', count: 6 }),
    ]));
    expect(detail?.actionSlots?.author?.actions.map((action) => action.id)).toEqual([
      'react',
      'reply',
      'bookmark',
      'like',
    ]);
  });

  it('keeps the question navigation when the background is absent', () => {
    document.body.innerHTML = `
      <h1 class="QuestionHeader-title">如何保持专注？</h1>
      <article class="ContentItem AnswerItem" data-zop='{"type":"answer","itemId":"42"}'>
        <a class="UserLink-link" href="/people/reader">林一</a>
        <div class="RichContent-inner"><p>回答正文。</p></div>
      </article>`;

    const url = new URL('https://www.zhihu.com/question/1/answer/42');
    const root = findZhihuDetailRoot(document, url);
    const detail = root ? parseZhihuDetail(root, url) : null;

    expect(detail?.context).toEqual({
      body: [],
      navigation: {
        label: '查看全部回答',
        url: 'https://www.zhihu.com/question/1',
      },
    });
  });

  it('preserves interleaved images in the answer body DOM order', () => {
    document.body.innerHTML = `
      <h1 class="QuestionHeader-title">如何组织图文回答？</h1>
      <article class="ContentItem AnswerItem" data-zop='{"type":"answer","itemId":"42"}'>
        <a class="UserLink-link" href="/people/reader">林一</a>
        <div class="RichContent-inner">
          <div class="css-wrapper">
            <span class="RichText ztext CopyrightRichText-richText">
              <p>图片前的正文。<script>alert(1)</script></p>
              <figure>
                <div class="RichText-ConditionalImagePortal">
                  <img data-original="https://pic.example/first.jpg" alt="第一张图" />
                </div>
              </figure>
              <p>两张图片之间的正文。</p>
              <img data-actualsrc="https://pic.example/second.jpg" alt="第二张图" />
              <p>图片后的正文。</p>
            </span>
          </div>
        </div>
      </article>`;

    const url = new URL('https://www.zhihu.com/question/1/answer/42');
    const root = findZhihuDetailRoot(document, url);
    const detail = root ? parseZhihuDetail(root, url) : null;

    expect(detail?.body.map((block) => block.type)).toEqual([
      'richText',
      'gallery',
      'richText',
      'gallery',
      'richText',
    ]);
    expect(detail?.body).toMatchObject([
      { type: 'richText', plainText: '图片前的正文。' },
      {
        type: 'gallery',
        items: [{ url: 'https://pic.example/first.jpg', alt: '第一张图' }],
      },
      { type: 'richText', plainText: '两张图片之间的正文。' },
      {
        type: 'gallery',
        items: [{ url: 'https://pic.example/second.jpg', alt: '第二张图' }],
      },
      { type: 'richText', plainText: '图片后的正文。' },
    ]);
    expect(detail?.body[0]).not.toMatchObject({ html: expect.stringContaining('script') });
  });

  it('expands a collapsed question background before publishing the detail', async () => {
    document.body.innerHTML = `
      <h1 class="QuestionHeader-title">如何保持专注？</h1>
      <div class="QuestionRichText QuestionRichText--expandable QuestionRichText--collapsed">
        <div>
          <span itemprop="text">折叠占位内容</span>
          <button class="QuestionRichText-more" type="button">显示全部</button>
        </div>
      </div>
      <article class="ContentItem AnswerItem" data-zop='{"type":"answer","itemId":"42"}'>
        <a class="UserLink-link" href="/people/reader">林一</a>
        <div class="RichContent-inner"><p>回答正文。</p></div>
      </article>`;

    const question = document.querySelector<HTMLElement>('.QuestionRichText')!;
    const button = document.querySelector<HTMLButtonElement>('.QuestionRichText-more')!;
    const click = vi.spyOn(button, 'click');
    button.addEventListener('click', () => {
      question.classList.remove('QuestionRichText--collapsed');
      question.innerHTML = `
        <div class="RichContent-inner"><p>完整问题背景。</p></div>
      `;
    });
    const onDetail = vi.fn();
    const adapter = new ZhihuDetailAdapter(onDetail);

    window.history.replaceState({}, '', '/question/1/answer/42');
    adapter.init();

    expect(click).toHaveBeenCalledOnce();
    expect(onDetail).not.toHaveBeenCalled();
    await vi.waitFor(() => expect(onDetail).toHaveBeenCalled());
    expect(onDetail.mock.lastCall?.[0].context?.body[0]).toMatchObject({
      type: 'richText',
      plainText: '完整问题背景。',
    });
    adapter.disconnect();
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
