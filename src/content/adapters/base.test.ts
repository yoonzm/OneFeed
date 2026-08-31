import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FeedItem } from '../../types/feed';
import {
  BaseAdapter,
  collectFeedChannelBindings,
  type FeedPageContext,
  type RuntimeFeedChannelBinding,
} from './base';

class TestAdapter extends BaseAdapter {
  protected readonly cardSelector = '[data-feed-card]';

  parseCard(element: Element): FeedItem | null {
    const id = element.getAttribute('data-feed-card');
    if (!id) return null;
    return {
      id,
      platform: 'test',
      source: { id: 'test', name: '测试' },
      originalUrl: 'https://example.com/',
      kind: 'post',
      role: 'post',
      author: { name: '测试用户', avatar: '' },
      previewBlocks: [{ type: 'richText', html: '<span>测试内容</span>', plainText: '测试内容' }],
      metrics: [],
      actions: [],
    };
  }

  triggerAction(itemId: string, actionId: string): boolean {
    void actionId;
    return Boolean(this.getRuntimeElement(itemId));
  }
}

class PagedTestAdapter extends BaseAdapter {
  protected readonly cardSelector = '[data-feed-card]';
  protected override readonly loadingStrategy = {
    kind: 'document-page',
    nextSelector: 'a[rel="next"]',
  } as const;

  parseCard(element: Element, context: FeedPageContext): FeedItem | null {
    const id = element.getAttribute('data-feed-card');
    if (!id) return null;
    return {
      id,
      platform: 'test',
      source: { id: 'test', name: '测试' },
      originalUrl: new URL(`/items/${id}`, context.url).href,
      kind: 'post',
      role: 'post',
      author: { name: '测试用户', avatar: '' },
      previewBlocks: [],
      metrics: [],
      actions: [],
    };
  }

  triggerAction(): boolean {
    return false;
  }

  getBinding(itemId: string) {
    return this.getRuntimeBinding(itemId);
  }
}

class ControlTestAdapter extends TestAdapter {
  protected override readonly loadingStrategy = {
    kind: 'dom-control',
    selector: '[data-load-more]',
  } as const;
}

class ChannelTestAdapter extends TestAdapter {
  protected override getFeedChannelBindings(root: ParentNode): RuntimeFeedChannelBinding[] {
    return collectFeedChannelBindings(
      root,
      '[data-feed-channel]',
      new URL(window.location.href),
    );
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('BaseAdapter', () => {
  it('discovers added site channels and proxies selection through the original control', async () => {
    document.body.innerHTML = `
      <nav>
        <button data-feed-channel data-value="latest" aria-selected="true">
          最新
          <style data-emotion="css channel">.css-channel { color: blue; }</style>
        </button>
        <button data-feed-channel data-value="top">热门</button>
      </nav>`;
    const channelsListener = vi.fn();
    const adapter = new ChannelTestAdapter(vi.fn());
    adapter.setFeedChannelsListener(channelsListener);
    adapter.init();

    expect(adapter.getFeedChannels()).toEqual([
      expect.objectContaining({ label: '最新', active: true }),
      expect.objectContaining({ label: '热门', active: false }),
    ]);

    const experimental = document.createElement('button');
    experimental.dataset.feedChannel = '';
    experimental.dataset.value = 'experimental';
    experimental.textContent = '实验室';
    document.querySelector('nav')?.appendChild(experimental);
    await new Promise((resolve) => window.setTimeout(resolve, 180));

    expect(channelsListener).toHaveBeenLastCalledWith([
      expect.objectContaining({ label: '最新' }),
      expect.objectContaining({ label: '热门' }),
      expect.objectContaining({ label: '实验室' }),
    ]);

    const click = vi.spyOn(experimental, 'click').mockImplementation(() => undefined);
    const channelId = adapter.getFeedChannels().find((channel) => channel.label === '实验室')?.id;
    expect(adapter.triggerFeedChannel(channelId!)).toBe(true);
    expect(click).toHaveBeenCalledOnce();
    adapter.disconnect();
    expect(adapter.triggerFeedChannel(channelId!)).toBe(false);
  });

  it('scans existing cards and rescans after an infinite-feed update', async () => {
    document.body.innerHTML = '<article data-feed-card="first"></article>';
    const onItems = vi.fn();
    const adapter = new TestAdapter(onItems);

    adapter.init();
    expect(onItems).toHaveBeenLastCalledWith([
      expect.objectContaining({ id: 'first' }),
    ]);
    expect(adapter.triggerAction('first', 'open')).toBe(true);

    document.body.insertAdjacentHTML(
      'beforeend',
      '<article data-feed-card="second"></article>',
    );
    await new Promise((resolve) => window.setTimeout(resolve, 180));

    expect(onItems).toHaveBeenLastCalledWith([
      expect.objectContaining({ id: 'first' }),
      expect.objectContaining({ id: 'second' }),
    ]);
    adapter.disconnect();
    expect(adapter.triggerAction('first', 'open')).toBe(false);
  });

  it('keeps source scrolling as the default loading strategy', async () => {
    document.body.innerHTML = '<article data-feed-card="first"></article>';
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    const adapter = new TestAdapter(vi.fn());
    adapter.init();

    await expect(adapter.requestMore()).resolves.toEqual({
      kind: 'loaded',
      added: 0,
      hasMore: true,
    });
    expect(scrollTo).toHaveBeenCalledWith({
      top: document.documentElement.scrollHeight,
      behavior: 'smooth',
    });
    adapter.disconnect();
  });

  it('clicks a same-document load control and detects when it disappears', async () => {
    document.body.innerHTML = `
      <article data-feed-card="first"></article>
      <button data-load-more type="button">More</button>`;
    const control = document.querySelector<HTMLButtonElement>('[data-load-more]')!;
    const click = vi.spyOn(control, 'click').mockImplementation(() => undefined);
    const adapter = new ControlTestAdapter(vi.fn());
    adapter.init();

    await expect(adapter.requestMore()).resolves.toEqual({
      kind: 'loaded',
      added: 0,
      hasMore: true,
    });
    expect(click).toHaveBeenCalledOnce();

    control.remove();
    await expect(adapter.requestMore()).resolves.toEqual({ kind: 'exhausted' });
    adapter.disconnect();
  });

  it('fetches a document page once and parses it with its own URL context', async () => {
    document.body.innerHTML = `
      <article data-feed-card="first"></article>
      <a rel="next" href="/page-2">More</a>`;
    let resolveFetch!: (response: Response) => void;
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      void input;
      void init;
      return new Promise<Response>((resolve) => {
        resolveFetch = resolve;
      });
    });
    vi.stubGlobal('fetch', fetchMock);
    const onItems = vi.fn();
    const adapter = new PagedTestAdapter(onItems);
    adapter.init();

    const firstRequest = adapter.requestMore();
    const duplicateRequest = adapter.requestMore();
    expect(duplicateRequest).toBe(firstRequest);
    resolveFetch(new Response(
      '<article data-feed-card="second"></article><a rel="next" href="/page-2">More</a>',
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
    ));

    await expect(firstRequest).resolves.toEqual({
      kind: 'loaded',
      added: 1,
      hasMore: false,
    });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe('http://localhost:3000/page-2');
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      credentials: 'include',
      redirect: 'follow',
    });
    expect(onItems).toHaveBeenLastCalledWith([
      expect.objectContaining({
        id: 'second',
        originalUrl: 'http://localhost:3000/items/second',
      }),
    ]);
    expect(adapter.getBinding('second')).toMatchObject({
      live: false,
      pageUrl: new URL('http://localhost:3000/page-2'),
    });
    await expect(adapter.requestMore()).resolves.toEqual({ kind: 'exhausted' });
    expect(fetchMock).toHaveBeenCalledOnce();
    adapter.disconnect();
  });

  it('retries the same document page after a failed request', async () => {
    document.body.innerHTML = `
      <article data-feed-card="first"></article>
      <a rel="next" href="/page-2">More</a>`;
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new Error('network unavailable'))
      .mockResolvedValueOnce(new Response(
        '<article data-feed-card="second"></article>',
        { headers: { 'Content-Type': 'text/html' } },
      ));
    vi.stubGlobal('fetch', fetchMock);
    const adapter = new PagedTestAdapter(vi.fn());
    adapter.init();

    await expect(adapter.requestMore()).resolves.toEqual({
      kind: 'failed',
      retryable: true,
    });
    await expect(adapter.requestMore()).resolves.toMatchObject({
      kind: 'loaded',
      added: 1,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(String(fetchMock.mock.calls[1]?.[0]));
    adapter.disconnect();
  });

  it('aborts an in-flight document request when disconnected', async () => {
    document.body.innerHTML = `
      <article data-feed-card="first"></article>
      <a rel="next" href="/page-2">More</a>`;
    let requestSignal: AbortSignal | undefined;
    vi.stubGlobal('fetch', vi.fn((_url: URL, init?: RequestInit) => {
      requestSignal = init?.signal as AbortSignal;
      return new Promise<Response>((_resolve, reject) => {
        requestSignal?.addEventListener('abort', () => {
          reject(new DOMException('aborted', 'AbortError'));
        });
      });
    }));
    const adapter = new PagedTestAdapter(vi.fn());
    adapter.init();

    const request = adapter.requestMore();
    adapter.disconnect();

    expect(requestSignal?.aborted).toBe(true);
    await expect(request).resolves.toEqual({ kind: 'failed', retryable: false });
  });
});
