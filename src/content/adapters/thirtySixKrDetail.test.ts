import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  findThirtySixKrDetailRoot,
  isThirtySixKrDetailUrl,
  parseThirtySixKrDetail,
  ThirtySixKrDetailAdapter,
} from './thirtySixKrDetail';

interface ArticleFixtureOptions {
  articleId?: string;
  includeBody?: boolean;
  widgetContent?: string;
}

function renderArticle({
  articleId = '123456',
  includeBody = true,
  widgetContent = '<p>初始数据中的正文。</p>',
}: ArticleFixtureOptions = {}): Element {
  const initialState = {
    articleDetail: {
      articleDetailData: {
        data: {
          itemId: articleId,
          widgetTitle: '一篇代表性的 36Kr 文章',
          author: '测试作者',
          authorId: 7,
          authorFace: 'https://img.example/avatar.jpg',
          publishTime: 1787707723810,
          widgetContent,
        },
      },
    },
  };
  document.body.innerHTML = `
    <main class="article-wrapper">
      <h1 class="article-title">一篇代表性的 36Kr 文章</h1>
      <div class="article-title-icon">
        <a href="/user/7">测试作者</a>
        <span class="item-time">·2026年08月26日 09:28</span>
      </div>
      ${includeBody ? `
        <div class="articleDetailContent kr-rich-text-wrapper">
          <p class="copy" style="color:red" onclick="alert(1)">
            第一段。<script>alert(1)</script>
          </p>
          <p class="image-wrapper">
            <img
              src="/article.jpg"
              alt="文章配图"
              data-img-size-val="1200,800"
            />
          </p>
          <p class="img-desc">图注</p>
          <h2>第二节</h2>
          <blockquote>引用说明</blockquote>
          <p><a href="/source" onclick="alert(1)">来源</a></p>
        </div>
      ` : ''}
    </main>`;
  const stateScript = document.createElement('script');
  stateScript.textContent = `window.__GATEWAY_SIGN__="test";window.initialState=${JSON.stringify(initialState)}`;
  document.body.prepend(stateScript);
  return document.querySelector('.article-wrapper')!;
}

afterEach(() => {
  document.body.innerHTML = '';
  window.history.replaceState({}, '', '/');
});

describe('isThirtySixKrDetailUrl', () => {
  it('matches article details without matching unrelated or lookalike routes', () => {
    expect(isThirtySixKrDetailUrl(new URL('https://36kr.com/p/123456'))).toBe(true);
    expect(isThirtySixKrDetailUrl(new URL('https://www.36kr.com/p/123456/'))).toBe(true);
    expect(isThirtySixKrDetailUrl(new URL('https://36kr.com/information/web_news/'))).toBe(false);
    expect(isThirtySixKrDetailUrl(new URL('https://36kr.com/p/not-an-id'))).toBe(false);
    expect(isThirtySixKrDetailUrl(new URL('https://36kr.com.example.com/p/123456'))).toBe(false);
  });
});

describe('36Kr article detail', () => {
  it('normalizes metadata and preserves sanitized image order', () => {
    const element = renderArticle();
    const url = new URL('https://36kr.com/p/123456');
    const detail = parseThirtySixKrDetail(element, url);

    expect(detail).toMatchObject({
      id: '36kr_123456',
      platform: '36kr',
      source: { id: '36kr', name: '36Kr' },
      originalUrl: 'https://36kr.com/p/123456',
      kind: 'article',
      role: 'article',
      title: '一篇代表性的 36Kr 文章',
      author: {
        name: '测试作者',
        avatar: 'https://img.example/avatar.jpg',
        link: 'https://36kr.com/user/7',
      },
      publishedAt: 1787707723810,
    });
    expect(detail?.body.map((block) => block.type)).toEqual([
      'richText',
      'gallery',
      'richText',
    ]);
    expect(detail?.body[0]).toMatchObject({
      type: 'richText',
      plainText: '第一段。',
    });
    expect(detail?.body[0]).not.toMatchObject({
      html: expect.stringMatching(/script|style=|onclick=|class=/),
    });
    expect(detail?.body[1]).toEqual({
      type: 'gallery',
      items: [{
        url: 'https://36kr.com/article.jpg',
        alt: '文章配图',
        width: 1200,
        height: 800,
        aspectRatio: 1.5,
      }],
    });
    expect(detail?.body[2]).toMatchObject({
      type: 'richText',
      plainText: expect.stringContaining('第二节'),
      html: expect.stringContaining('href="https://36kr.com/source"'),
    });
  });

  it('uses sanitized initial content while the live body is still loading', () => {
    const element = renderArticle({
      includeBody: false,
      widgetContent: '<p style="color:red">初始正文。<script>alert(1)</script></p>',
    });
    const url = new URL('https://36kr.com/p/123456');
    const root = findThirtySixKrDetailRoot(document, url);
    const detail = root ? parseThirtySixKrDetail(root, url) : null;

    expect(root).toBe(element);
    expect(detail?.body).toEqual([{
      type: 'richText',
      html: '<p>初始正文。</p>',
      plainText: '初始正文。',
    }]);
  });

  it('does not publish stale article DOM for a different URL', () => {
    renderArticle({ articleId: '123456' });
    expect(findThirtySixKrDetailRoot(
      document,
      new URL('https://36kr.com/p/654321'),
    )).toBeNull();
  });

  it('publishes the active detail and exposes no unsupported native actions', () => {
    renderArticle();
    window.history.replaceState({}, '', '/p/123456');
    const onDetail = vi.fn();
    const adapter = new ThirtySixKrDetailAdapter(onDetail);

    adapter.init();

    expect(onDetail).toHaveBeenCalledOnce();
    expect(onDetail.mock.lastCall?.[0]).toMatchObject({ id: '36kr_123456' });
    expect(adapter.triggerAction('36kr_123456', 'react')).toBe(false);
    adapter.disconnect();
  });
});
