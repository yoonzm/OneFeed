import { describe, expect, it, vi } from 'vitest';
import {
  createWereadSearchUrl,
  isWereadFeedUrl,
  parseWereadCard,
  parseWereadNumber,
  WereadAdapter,
} from './weread';

function renderBook(id = 'abc123'): Element {
  document.body.innerHTML = `
    <li class="wr_bookList_item">
      <a class="wr_bookList_item_link" href="/web/reader/${id}"></a>
      <div class="wr_bookList_item_container">
        <div class="wr_bookCover wr_bookList_item_cover">
          <img class="wr_bookCover_img" src="/cover.jpg" alt="代表性图书封面" />
        </div>
        <div class="wr_bookList_item_info">
          <p class="wr_bookList_item_title">一本代表性的书</p>
          <p class="wr_bookList_item_author">
            <a href="/web/search/books?author=%E6%B5%8B%E8%AF%95%E4%BD%9C%E8%80%85">测试作者</a>
          </p>
          <p class="wr_bookList_item_reading">
            <span class="wr_bookList_item_reading_number">1.7 万</span>
            <span class="wr_bookList_item_reading_percent">93.4%</span>
          </p>
          <p class="wr_bookList_item_desc">简介包含 &lt;script&gt; 文本与 <strong>重点</strong></p>
        </div>
      </div>
    </li>`;
  return document.querySelector('.wr_bookList_item')!;
}

describe('parseWereadNumber', () => {
  it('normalizes exact, compact, and percentage values', () => {
    expect(parseWereadNumber('1,234')).toBe(1234);
    expect(parseWereadNumber('1.7 万')).toBe(17_000);
    expect(parseWereadNumber('2.5K')).toBe(2500);
    expect(parseWereadNumber('93.4%')).toBe(93.4);
    expect(parseWereadNumber('暂无')).toBeUndefined();
  });
});

describe('parseWereadCard', () => {
  it('normalizes public book metadata, summary, cover, and metrics', () => {
    const item = parseWereadCard(
      renderBook(),
      new URL('https://weread.qq.com/web/category/rising'),
    );

    expect(item).toMatchObject({
      id: 'weread_abc123',
      platform: 'weread',
      source: { id: 'weread', name: '微信读书' },
      originalUrl: 'https://weread.qq.com/web/reader/abc123',
      kind: 'article',
      role: 'article',
      title: '一本代表性的书',
      author: {
        name: '测试作者',
        avatar: '',
        link: 'https://weread.qq.com/web/search/books?author=%E6%B5%8B%E8%AF%95%E4%BD%9C%E8%80%85',
      },
      metrics: [
        { kind: 'views', value: 17_000, label: '今日阅读' },
        { kind: 'score', value: 93.4, label: '推荐值' },
      ],
      actions: [{ id: 'open', kind: 'open', label: '查看原文', enabled: true }],
    });
    expect(item?.previewBlocks).toEqual([
      {
        type: 'richText',
        html: '<p>简介包含 &lt;script&gt; 文本与 重点</p>',
        plainText: '简介包含 <script> 文本与 重点',
      },
      {
        type: 'gallery',
        items: [{
          url: 'https://weread.qq.com/cover.jpg',
          alt: '代表性图书封面',
        }],
      },
    ]);
  });

  it('accepts unavailable-book links and ignores malformed cards', () => {
    const element = renderBook('unavailable');
    element.querySelector('a')?.setAttribute('href', '/web/bookDetail/unavailable');
    expect(parseWereadCard(element)).toMatchObject({
      id: 'weread_unavailable',
      originalUrl: 'http://localhost:3000/web/bookDetail/unavailable',
    });

    element.querySelector('.wr_bookList_item_title')?.remove();
    expect(parseWereadCard(element)).toBeNull();
  });
});

describe('WereadAdapter', () => {
  it('only matches public category and populated book-search routes', () => {
    expect(isWereadFeedUrl(new URL('https://weread.qq.com/web/category/rising'))).toBe(true);
    expect(isWereadFeedUrl(new URL('https://weread.qq.com/web/category/100000/'))).toBe(true);
    expect(isWereadFeedUrl(new URL(
      'https://weread.qq.com/web/search/books?keyword=%E9%98%85%E8%AF%BB',
    ))).toBe(true);
    expect(isWereadFeedUrl(new URL(
      'https://weread.qq.com/web/search/books?author=%E4%BD%9C%E8%80%85',
    ))).toBe(true);
    expect(isWereadFeedUrl(new URL('https://weread.qq.com/web/search/books'))).toBe(false);
    expect(isWereadFeedUrl(new URL('https://weread.qq.com/web/reader/abc123'))).toBe(false);
    expect(isWereadFeedUrl(new URL('https://weread.qq.com/web/bookDetail/abc123'))).toBe(false);
    expect(isWereadFeedUrl(new URL('https://weread.qq.com/web/shelf'))).toBe(false);
    expect(isWereadFeedUrl(new URL('https://weread.qq.com.example.com/web/category/rising')))
      .toBe(false);
  });

  it('discovers ranking channels and rescans books added by infinite scrolling', async () => {
    const first = renderBook('first').outerHTML;
    const second = renderBook('second').outerHTML;
    document.body.innerHTML = `
      <aside id="ranking_page_sidebar">
        <ul class="ranking_list">
          <li class="ranking_list_item_current">
            <a class="ranking_list_item_link" href="/web/category/rising">飙升榜</a>
          </li>
          <li><a class="ranking_list_item_link" href="/web/category/newbook">新书榜</a></li>
        </ul>
      </aside>
      ${first}`;
    const onItems = vi.fn();
    const adapter = new WereadAdapter(onItems);
    adapter.init();

    expect(adapter.getFeedChannels().map(({ label, active }) => ({ label, active }))).toEqual([
      { label: '飙升榜', active: true },
      { label: '新书榜', active: false },
    ]);
    document.body.insertAdjacentHTML('beforeend', second);
    await new Promise((resolve) => window.setTimeout(resolve, 180));

    expect(onItems).toHaveBeenLastCalledWith([
      expect.objectContaining({ id: 'weread_first' }),
      expect.objectContaining({ id: 'weread_second' }),
    ]);
    adapter.disconnect();
  });

  it('builds site search URLs and uses the default source-scroll loader', async () => {
    expect(createWereadSearchUrl('  三体  ')?.href).toBe(
      'https://weread.qq.com/web/search/books?keyword=%E4%B8%89%E4%BD%93',
    );
    expect(createWereadSearchUrl(' ')).toBeNull();

    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    const adapter = new WereadAdapter(vi.fn());
    adapter.init();
    await expect(adapter.requestMore()).resolves.toMatchObject({ kind: 'loaded', hasMore: true });
    expect(scrollTo).toHaveBeenCalledOnce();
    adapter.disconnect();
  });
});
