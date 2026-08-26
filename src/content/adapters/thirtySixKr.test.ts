import { describe, expect, it, vi } from 'vitest';
import {
  parseThirtySixKrCard,
  ThirtySixKrAdapter,
} from './thirtySixKr';

function renderArticle(): Element {
  document.body.innerHTML = `
    <div class="information-flow-item">
      <div class="kr-flow-article-item">
        <div class="article-item-pic-wrapper">
          <a class="article-item-channel" href="/information/technology">科技</a>
          <a class="article-item-pic" href="/p/123456">
            <img src="/cover.jpg" alt="代表性文章封面" />
          </a>
        </div>
        <div class="article-item-info">
          <a class="article-item-title" href="/p/123456">一篇代表性的 36Kr 文章</a>
          <a class="article-item-description" href="/p/123456">
            摘要包含 &lt;script&gt; 标签文本与 <strong>重点</strong>
          </a>
          <div class="kr-flow-bar">
            <span class="kr-flow-bar-motif">
              来自主题：<a href="/motif/42">人工智能</a>|
            </span>
            <a class="kr-flow-bar-author" href="/user/7">测试作者</a>
            <span class="kr-flow-bar-time"><i></i>3分钟前</span>
          </div>
        </div>
      </div>
    </div>`;
  return document.querySelector('.information-flow-item')!;
}

describe('parseThirtySixKrCard', () => {
  it('normalizes article metadata, summary, and cover image', () => {
    const item = parseThirtySixKrCard(
      renderArticle(),
      new URL('https://36kr.com/information/web_news/'),
    );

    expect(item).toMatchObject({
      id: '36kr_123456',
      platform: '36kr',
      source: { id: '36kr', name: '36Kr' },
      originalUrl: 'https://36kr.com/p/123456',
      kind: 'article',
      role: 'article',
      title: '一篇代表性的 36Kr 文章',
      author: {
        name: '测试作者',
        avatar: '',
        link: 'https://36kr.com/user/7',
      },
      context: {
        community: {
          name: '科技',
          url: 'https://36kr.com/information/technology',
        },
        tags: [{
          name: '人工智能',
          url: 'https://36kr.com/motif/42',
        }],
      },
      publishedAt: '3分钟前',
      metrics: [],
      actions: [{ id: 'open', kind: 'open', label: '查看原文', enabled: true }],
    });
    expect(item?.previewBlocks).toEqual([
      {
        type: 'richText',
        html: '<p>摘要包含 &lt;script&gt; 标签文本与 重点</p>',
        plainText: '摘要包含 <script> 标签文本与 重点',
      },
      {
        type: 'gallery',
        items: [{
          url: 'https://36kr.com/cover.jpg',
          alt: '代表性文章封面',
        }],
      },
    ]);
  });

  it('ignores malformed rows without a stable article link', () => {
    document.body.innerHTML = '<div class="information-flow-item">普通推荐内容</div>';
    expect(parseThirtySixKrCard(document.body.firstElementChild!)).toBeNull();
  });

  it('recovers the article URL from the card marker when 36Kr omits href', () => {
    const element = renderArticle();
    element.insertAdjacentHTML('afterbegin', '<div class="anchor-123456"></div>');
    element.querySelectorAll('.article-item-title, .article-item-pic')
      .forEach((link) => link.removeAttribute('href'));

    expect(parseThirtySixKrCard(
      element,
      new URL('https://36kr.com/information/web_news/'),
    )).toMatchObject({
      id: '36kr_123456',
      originalUrl: 'https://36kr.com/p/123456',
    });
  });
});

describe('ThirtySixKrAdapter', () => {
  it('discovers information channels and their nested selected state', () => {
    document.body.innerHTML = `
      <nav class="kr-information-channel">
        <a href="/information/web_news/latest/"><span class="channel-item active">最新</span></a>
        <a href="/information/technology/"><span class="channel-item">科技</span></a>
      </nav>`;
    const adapter = new ThirtySixKrAdapter(vi.fn());
    adapter.init();

    expect(adapter.getFeedChannels().map(({ label, active }) => ({ label, active }))).toEqual([
      { label: '最新', active: true },
      { label: '科技', active: false },
    ]);
    adapter.disconnect();
  });

  it('proxies infinite loading through the visible load-more control', async () => {
    document.body.innerHTML = '<div class="kr-loading-more-button show">查看更多</div>';
    const control = document.querySelector<HTMLElement>('.kr-loading-more-button')!;
    const click = vi.spyOn(control, 'click').mockImplementation(() => undefined);
    const adapter = new ThirtySixKrAdapter(vi.fn());
    adapter.init();

    await expect(adapter.requestMore()).resolves.toEqual({
      kind: 'loaded',
      added: 0,
      hasMore: true,
    });
    expect(click).toHaveBeenCalledOnce();
    adapter.disconnect();
  });
});
