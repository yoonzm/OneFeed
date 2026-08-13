import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  HackerNewsAdapter,
  parseHackerNewsCard,
  parseHackerNewsCount,
  triggerHackerNewsAction,
} from './hackerNews';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function renderStory(): Element {
  document.body.innerHTML = `
    <table>
      <tbody>
        <tr class="athing submission" id="43876543">
          <td class="title"><span class="rank">12.</span></td>
          <td class="votelinks">
            <a id="up_43876543" href="vote?id=43876543&amp;how=up&amp;goto=news">upvote</a>
          </td>
          <td class="title">
            <span class="titleline">
              <a href="https://example.com/story">
                A representative story
                <span data-read-frog-translation-mode="bilingual">重复翻译</span>
              </a>
              <span class="sitebit">
                (<a href="from?site=example.com"><span class="sitestr">example.com</span></a>)
              </span>
            </span>
          </td>
        </tr>
        <tr>
          <td colspan="2"></td>
          <td class="subtext">
            <span class="score">1,234 points</span> by
            <a class="hnuser" href="user?id=alice">alice</a>
            <span class="age" title="2025-03-09T16:00:00 1741536000">
              <a href="item?id=43876543">2 hours ago</a>
            </span>
            | <a href="item?id=43876543">56 comments</a>
          </td>
        </tr>
      </tbody>
    </table>`;
  return document.querySelector('tr.athing')!;
}

describe('parseHackerNewsCount', () => {
  it('parses scores and comment counts', () => {
    expect(parseHackerNewsCount('1,234 points')).toBe(1234);
    expect(parseHackerNewsCount('1 comment')).toBe(1);
    expect(parseHackerNewsCount('discuss')).toBe(0);
  });
});

describe('parseHackerNewsCard', () => {
  it('normalizes a story and its adjacent metadata row', () => {
    const item = parseHackerNewsCard(renderStory());

    expect(item).toMatchObject({
      id: 'hacker-news_43876543',
      platform: 'hacker-news',
      source: { id: 'hacker-news', name: 'Hacker News' },
      originalUrl: 'https://example.com/story',
      kind: 'discussion',
      role: 'topic',
      title: 'A representative story',
      author: {
        name: 'alice',
        avatar: '',
        link: 'http://localhost:3000/user?id=alice',
      },
      sequence: 12,
      context: {
        community: {
          name: 'example.com',
          url: 'http://localhost:3000/from?site=example.com',
        },
      },
      publishedAt: 1741536000000,
      metrics: [{ kind: 'score', value: 1234, label: '分数' }],
    });
    expect(item?.actions).toEqual([
      expect.objectContaining({ id: 'react', kind: 'react', variant: 'upvote' }),
      expect.objectContaining({ id: 'reply', kind: 'reply', count: 56 }),
      expect.objectContaining({ id: 'open', kind: 'open' }),
    ]);
    expect(item?.previewBlocks).toEqual([]);
  });

  it('supports job rows without score, author, or comments', () => {
    document.body.innerHTML = `
      <table><tbody>
        <tr class="athing submission" id="43870000">
          <td class="title"><span class="rank">1.</span></td>
          <td></td>
          <td class="title"><span class="titleline"><a href="https://jobs.example.com/role">Hiring engineers</a></span></td>
        </tr>
        <tr><td></td><td class="subtext"><span class="age" title="2025-03-09T16:00:00 1741536000"><a href="item?id=43870000">1 hour ago</a></span></td></tr>
      </tbody></table>`;

    expect(parseHackerNewsCard(document.querySelector('tr.athing')!)).toMatchObject({
      id: 'hacker-news_43870000',
      author: { name: 'Hacker News' },
      metrics: [],
      actions: [{ id: 'open', kind: 'open', label: '查看原文', enabled: true }],
    });
  });

  it('ignores malformed rows without a stable id or title', () => {
    document.body.innerHTML = `
      <table><tbody><tr class="athing submission"><td class="title"></td></tr></tbody></table>`;
    expect(parseHackerNewsCard(document.querySelector('tr')!)).toBeNull();
  });

  it('resolves relative links against the fetched page URL', () => {
    const element = renderStory();
    element.querySelector<HTMLAnchorElement>('.titleline > a')!
      .setAttribute('href', 'item?id=43876543');

    expect(parseHackerNewsCard(
      element,
      new URL('https://news.ycombinator.com/?p=2'),
    )).toMatchObject({
      originalUrl: 'https://news.ycombinator.com/item?id=43876543',
      author: { link: 'https://news.ycombinator.com/user?id=alice' },
    });
  });
});

describe('triggerHackerNewsAction', () => {
  it('proxies upvotes and comment navigation through the original controls', () => {
    const element = renderStory();
    const voteLink = element.querySelector<HTMLAnchorElement>('a[id^="up_"]')!;
    const commentsLink = element.nextElementSibling!
      .querySelectorAll<HTMLAnchorElement>('a[href^="item?id="]')[1]!;
    const voteClick = vi.spyOn(voteLink, 'click').mockImplementation(() => undefined);
    const commentsClick = vi.spyOn(commentsLink, 'click').mockImplementation(() => undefined);

    expect(triggerHackerNewsAction(element, 'react')).toBe(true);
    expect(triggerHackerNewsAction(element, 'reply')).toBe(true);
    expect(triggerHackerNewsAction(element, 'bookmark')).toBe(false);
    expect(voteClick).toHaveBeenCalledOnce();
    expect(commentsClick).toHaveBeenCalledOnce();
  });

  it('opens the original control target for a card parsed from a detached page', () => {
    const element = renderStory();
    element.closest('table')?.remove();
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);

    expect(triggerHackerNewsAction(
      element,
      'reply',
      new URL('https://news.ycombinator.com/?p=2'),
      false,
    )).toBe(true);
    expect(open).toHaveBeenCalledWith(
      'https://news.ycombinator.com/item?id=43876543',
      '_blank',
      'noopener,noreferrer',
    );
  });
});

describe('HackerNewsAdapter pagination', () => {
  it('loads the next HTML document without navigating the current page', async () => {
    renderStory();
    document.body.insertAdjacentHTML(
      'beforeend',
      '<a class="morelink" rel="next" href="?p=2">More</a>',
    );
    const responses = [
      new Response(`
        <table><tbody>
          <tr class="athing submission" id="43876544">
            <td class="title"><span class="rank">31.</span></td>
            <td></td>
            <td class="title">
              <span class="titleline"><a href="item?id=43876544">Page two story</a></span>
            </td>
          </tr>
          <tr><td></td><td></td><td class="subtext"><a href="item?id=43876544">discuss</a></td></tr>
        </tbody></table>
        <a class="morelink" rel="next" href="?p=3">More</a>
      `, { headers: { 'Content-Type': 'text/html' } }),
      new Response(`
        <table><tbody>
          <tr class="athing submission" id="43876545">
            <td class="title"><span class="rank">61.</span></td>
            <td></td>
            <td class="title">
              <span class="titleline"><a href="item?id=43876545">Page three story</a></span>
            </td>
          </tr>
          <tr><td></td><td></td><td class="subtext"><a href="item?id=43876545">discuss</a></td></tr>
        </tbody></table>
      `, { headers: { 'Content-Type': 'text/html' } }),
    ];
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      void input;
      void init;
      return Promise.resolve(responses.shift()!);
    });
    vi.stubGlobal('fetch', fetchMock);
    const onItems = vi.fn();
    const adapter = new HackerNewsAdapter(onItems);
    const initialUrl = window.location.href;
    adapter.init();

    await expect(adapter.requestMore()).resolves.toEqual({
      kind: 'loaded',
      added: 1,
      hasMore: true,
    });
    expect(window.location.href).toBe(initialUrl);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe('http://localhost:3000/?p=2');
    expect(onItems).toHaveBeenLastCalledWith([
      expect.objectContaining({
        id: 'hacker-news_43876544',
        originalUrl: 'http://localhost:3000/item?id=43876544',
        sequence: 31,
      }),
    ]);

    await expect(adapter.requestMore()).resolves.toEqual({
      kind: 'loaded',
      added: 1,
      hasMore: false,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[1]?.[0])).toBe('http://localhost:3000/?p=3');
    expect(onItems).toHaveBeenLastCalledWith([
      expect.objectContaining({
        id: 'hacker-news_43876545',
        sequence: 61,
      }),
    ]);
    adapter.disconnect();
  });
});
