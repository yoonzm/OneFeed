import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  isWereadDetailUrl,
  parseWereadDetail,
  resolveWereadChapterUrl,
  WereadDetailAdapter,
} from './wereadDetail';

const readerUrl = new URL('https://weread.qq.com/web/reader/book-token');

function renderReaderFixture(): void {
  document.title = '示例图书 - 第二章 - 示例作者 - 微信读书';
  document.head.innerHTML = '<meta name="description" content="第二章 小标题 正文第一段。 正文第二段。">';
  document.body.innerHTML = `
    <a class="readerTopBar_title_link">示例图书</a>
    <span class="readerTopBar_title_chapter">第二章</span>
    <div class="readerCatalog_bookInfo_author">示例作者</div>
    <ul>
      <li class="readerCatalog_list_item"><span class="readerCatalog_list_item_title_text">第一章</span></li>
      <li class="readerCatalog_list_item readerCatalog_list_item_selected"><span class="readerCatalog_list_item_title_text">第二章</span></li>
      <li class="readerCatalog_list_item"><span class="readerCatalog_list_item_title_text">第三章</span></li>
    </ul>
    <button class="readerHeaderButton">上一章</button>
    <button class="readerFooter_button" title="下一章">下一章</button>
  `;
}

describe('WeRead detail adapter', () => {
  beforeEach(renderReaderFixture);

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('matches reader routes only', () => {
    expect(isWereadDetailUrl(readerUrl)).toBe(true);
    expect(isWereadDetailUrl(new URL('https://weread.qq.com/web/bookDetail/book-token')))
      .toBe(false);
    expect(isWereadDetailUrl(new URL('https://example.com/web/reader/book-token'))).toBe(false);
  });

  it('resolves adjacent chapters from the reader initialization state', () => {
    const state = {
      reader: {
        infoId: '33332bf05cbba0333b1efb4k8e232ec02198e296a067180',
        currentChapter: { chapterUid: 25 },
        chapterInfos: [
          { chapterUid: 24 },
          { chapterUid: 25 },
          { chapterUid: 26 },
        ],
      },
    };
    const html = `<script>window.__INITIAL_STATE__=${JSON.stringify(state)};(function(){})();</script>`;
    const currentUrl = new URL(
      'https://weread.qq.com/web/reader/33332bf05cbba0333b1efb4k8e232ec02198e296a067180',
    );

    expect(resolveWereadChapterUrl(html, currentUrl, 'previous')?.href).toBe(
      'https://weread.qq.com/web/reader/33332bf05cbba0333b1efb4k1ff325f02181ff1de7742fc',
    );
    expect(resolveWereadChapterUrl(html, currentUrl, 'next')?.href).toBe(
      'https://weread.qq.com/web/reader/33332bf05cbba0333b1efb4k4e73277021a4e732ced3b55',
    );
  });

  it('normalizes the current chapter into a paged article detail', () => {
    const detail = parseWereadDetail(document, readerUrl);

    expect(detail).toMatchObject({
      id: 'weread_book-token',
      platform: 'weread',
      kind: 'article',
      role: 'article',
      title: '示例图书',
      author: false,
      metadataLabels: ['第二章'],
      pagination: {
        currentPage: 2,
        totalPages: 3,
        previous: { id: 'previous-page', kind: 'navigate', enabled: true },
        next: { id: 'next-page', kind: 'navigate', enabled: true },
      },
    });
    expect(detail?.body).toEqual([{
      type: 'richText',
      html: '<h2>第二章</h2>',
      plainText: '第二章',
    }, {
      type: 'richText',
      html: '<h2>小标题</h2><p>正文第一段。</p><p>正文第二段。</p>',
      plainText: '小标题 正文第一段。 正文第二段。',
    }]);
  });

  it('escapes metadata text before exposing it as rich text', () => {
    document.querySelector('meta[name="description"]')
      ?.setAttribute('content', '第二章 <img src=x onerror=alert(1)>。');

    const detail = parseWereadDetail(document, readerUrl);
    const block = detail?.body[1];
    expect(block?.type).toBe('richText');
    expect(block?.type === 'richText' ? block.html : '').toContain('&lt;img');
    expect(block?.type === 'richText' ? block.html : '').not.toContain('<img');
  });

  it('keeps an existing chapter heading without adding a duplicate', () => {
    const preRender = document.createElement('div');
    preRender.className = 'preRenderContent';
    preRender.innerHTML = '<h1>第二章</h1><p>正文。</p>';
    document.body.appendChild(preRender);

    expect(parseWereadDetail(document, readerUrl)?.body).toEqual([{
      type: 'richText',
      html: '<h2>第二章</h2><p>正文。</p>',
      plainText: '第二章\n正文。',
    }]);
  });

  it('waits until the description belongs to the current chapter', () => {
    document.querySelector('meta[name="description"]')
      ?.setAttribute('content', '这是尚未切换为章节正文的图书简介。');

    expect(parseWereadDetail(document, readerUrl)).toBeNull();
  });

  it('normalizes pre-rendered chapter DOM when description remains a book summary', () => {
    document.querySelector('meta[name="description"]')
      ?.setAttribute('content', '这是图书简介，不是当前章节正文。');
    const preRender = document.createElement('div');
    preRender.className = 'preRenderContent';
    preRender.innerHTML = `
      <div>
        <h1><span>版</span><span>权</span><span>信</span><span>息</span></h1>
        <p><span>书名：</span><span>活着</span></p>
        <p><span>作者：</span><span>余华</span></p>
        <script>alert('unsafe')</script>
      </div>
    `;
    document.body.appendChild(preRender);

    const detail = parseWereadDetail(document, readerUrl);

    expect(detail?.body).toEqual([{
      type: 'richText',
      html: '<h2>第二章</h2>',
      plainText: '第二章',
    }, {
      type: 'richText',
      html: '<h2>版权信息</h2><p>书名：活着</p><p>作者：余华</p>',
      plainText: '版权信息\n书名：活着\n作者：余华',
    }]);
  });

  it('routes page navigation through stable chapter URLs', () => {
    const onDetail = vi.fn();
    const previous = document.querySelector<HTMLButtonElement>('.readerHeaderButton')!;
    const next = document.querySelector<HTMLButtonElement>('.readerFooter_button')!;
    const previousClick = vi.spyOn(previous, 'click');
    const nextClick = vi.spyOn(next, 'click');
    const navigateChapter = vi.fn(async () => true);
    const adapter = new WereadDetailAdapter(onDetail, () => readerUrl, navigateChapter);

    adapter.init();

    expect(onDetail).toHaveBeenCalledTimes(1);
    expect(adapter.triggerAction('weread_book-token', 'previous-page')).toBe(true);
    expect(navigateChapter).toHaveBeenCalledWith(readerUrl, 'previous');
    expect(previousClick).not.toHaveBeenCalled();
    expect(adapter.triggerAction('weread_book-token', 'next-page')).toBe(true);
    expect(nextClick).not.toHaveBeenCalled();
    expect(adapter.triggerAction('another-book', 'previous-page')).toBe(false);

    adapter.disconnect();
  });

  it('publishes the next normalized page after the source reader updates', async () => {
    const onDetail = vi.fn();
    const adapter = new WereadDetailAdapter(onDetail, () => readerUrl);

    try {
      adapter.init();
      document.querySelector('.readerTopBar_title_chapter')!.textContent = '第三章';
      document.querySelector('meta[name="description"]')
        ?.setAttribute('content', '第三章 新页面正文。');
      document.querySelector('.readerCatalog_list_item_selected')
        ?.classList.remove('readerCatalog_list_item_selected');
      document.querySelectorAll('.readerCatalog_list_item')[2]
        ?.classList.add('readerCatalog_list_item_selected');

      await new Promise((resolve) => window.setTimeout(resolve, 180));

      expect(onDetail).toHaveBeenCalledTimes(2);
      expect(onDetail.mock.calls[1]?.[0]).toMatchObject({
        metadataLabels: ['第三章'],
        pagination: { currentPage: 3, totalPages: 3 },
      });
    } finally {
      adapter.disconnect();
    }
  });

  it('publishes navigation when the native next control mounts after the chapter', async () => {
    document.querySelector('.readerFooter_button')?.remove();
    const onDetail = vi.fn();
    const adapter = new WereadDetailAdapter(onDetail, () => readerUrl);

    try {
      adapter.init();
      expect(onDetail).toHaveBeenCalledTimes(1);
      expect(onDetail.mock.calls[0]?.[0].pagination?.next).toBeUndefined();

      const next = document.createElement('button');
      next.className = 'readerFooter_button';
      next.title = '下一章';
      next.textContent = '下一章';
      document.body.appendChild(next);
      await new Promise((resolve) => window.setTimeout(resolve, 180));

      expect(onDetail).toHaveBeenCalledTimes(2);
      expect(onDetail.mock.calls[1]?.[0].pagination?.next).toMatchObject({
        id: 'next-page',
        kind: 'navigate',
        enabled: true,
      });
    } finally {
      adapter.disconnect();
    }
  });

  it('publishes the ready chapter while the source page keeps mutating', async () => {
    document.querySelector('meta[name="description"]')
      ?.setAttribute('content', '这是初始图书简介。');
    const onDetail = vi.fn();
    const adapter = new WereadDetailAdapter(onDetail, () => readerUrl);
    let mutationTimer: number | undefined;

    try {
      adapter.init();
      expect(onDetail).not.toHaveBeenCalled();
      document.querySelector('meta[name="description"]')
        ?.setAttribute('content', '第二章 已完成加载的章节正文。');
      mutationTimer = window.setInterval(() => {
        document.body.classList.toggle('reader-is-painting');
      }, 20);

      await new Promise((resolve) => window.setTimeout(resolve, 220));

      expect(onDetail).toHaveBeenCalledTimes(1);
      expect(onDetail.mock.calls[0]?.[0]).toMatchObject({
        metadataLabels: ['第二章'],
        pagination: {
          currentPage: 2,
          totalPages: 3,
          next: { id: 'next-page', enabled: true },
        },
      });
    } finally {
      window.clearInterval(mutationTimer);
      adapter.disconnect();
    }
  });

  it('keeps captured pre-rendered content after the source removes its temporary DOM', async () => {
    document.querySelector('meta[name="description"]')
      ?.setAttribute('content', '第二章 仅用于搜索的章节摘要。');
    const preRender = document.createElement('div');
    preRender.className = 'preRenderContent';
    preRender.innerHTML = '<h1>第二章</h1><p>完整章节正文。</p>';
    document.body.appendChild(preRender);
    const onDetail = vi.fn();
    const adapter = new WereadDetailAdapter(onDetail, () => readerUrl);

    try {
      adapter.init();
      expect(onDetail.mock.calls[0]?.[0].body[0]).toMatchObject({
        plainText: '第二章\n完整章节正文。',
      });

      preRender.remove();
      await new Promise((resolve) => window.setTimeout(resolve, 180));

      expect(onDetail).toHaveBeenCalledTimes(1);
    } finally {
      adapter.disconnect();
    }
  });

  it('publishes late navigation controls after pre-rendered content is removed', async () => {
    document.querySelector('.readerHeaderButton')?.remove();
    document.querySelector('.readerFooter_button')?.remove();
    const preRender = document.createElement('div');
    preRender.className = 'preRenderContent';
    preRender.innerHTML = '<h1>第二章</h1><p>完整章节正文。</p>';
    document.body.appendChild(preRender);
    const onDetail = vi.fn();
    const adapter = new WereadDetailAdapter(onDetail, () => readerUrl);

    try {
      adapter.init();
      expect(onDetail.mock.calls[0]?.[0].pagination).toMatchObject({
        currentPage: 2,
        totalPages: 3,
      });
      expect(onDetail.mock.calls[0]?.[0].pagination?.previous).toBeUndefined();
      expect(onDetail.mock.calls[0]?.[0].pagination?.next).toBeUndefined();

      preRender.remove();
      const previous = document.createElement('button');
      previous.className = 'readerHeaderButton';
      previous.textContent = '上一章';
      document.body.appendChild(previous);
      const next = document.createElement('button');
      next.className = 'readerFooter_button';
      next.title = '下一章';
      next.textContent = '下一章';
      document.body.appendChild(next);
      await new Promise((resolve) => window.setTimeout(resolve, 180));

      expect(onDetail).toHaveBeenCalledTimes(2);
      expect(onDetail.mock.calls[1]?.[0]).toMatchObject({
        body: [{ plainText: '第二章\n完整章节正文。' }],
        pagination: {
          previous: { id: 'previous-page', enabled: true },
          next: { id: 'next-page', enabled: true },
        },
      });
    } finally {
      adapter.disconnect();
    }
  });
});
