import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FeedItem, FeedLoadResult } from '../types/feed';
import FeedApp from './FeedApp';
import { useFeedStore } from './store/useFeedStore';
import { getSeenFeedItemStorageKey } from './useSeenFeedItems';

function feedItem(): FeedItem {
  return {
    id: 'item-1',
    platform: 'zhihu',
    source: { id: 'zhihu', name: '知乎' },
    originalUrl: 'https://example.com/item-1',
    kind: 'post',
    role: 'post',
    author: { name: '测试用户', avatar: '' },
    previewBlocks: [],
    metrics: [],
    actions: [],
  };
}

describe('FeedApp', () => {
  let root: Root | undefined;
  let storedValues: Record<string, unknown>;

  beforeEach(() => {
    storedValues = {};
    useFeedStore.getState().addFeedItems([feedItem()]);
    vi.stubGlobal('IntersectionObserver', undefined);
    vi.stubGlobal('chrome', {
      storage: {
        local: {
          get: vi.fn((defaults, callback) => callback(
            defaults === null ? storedValues : { ...defaults, ...storedValues },
          )),
          set: vi.fn((values) => Object.assign(storedValues, values)),
        },
        onChanged: {
          addListener: vi.fn(),
          removeListener: vi.fn(),
        },
      },
    });
  });

  afterEach(async () => {
    if (root) await act(async () => root?.unmount());
    root = undefined;
    useFeedStore.getState().clear();
    vi.unstubAllGlobals();
  });

  async function renderFeed(onLoadMore: () => Promise<FeedLoadResult>) {
    const scrollElement = document.createElement('div');
    const container = document.createElement('div');
    scrollElement.appendChild(container);
    document.body.appendChild(scrollElement);
    root = createRoot(container);

    await act(async () => {
      root?.render(
        <FeedApp
          activePlatformId="zhihu"
          scrollElement={scrollElement}
          onAction={vi.fn(() => false)}
          onLoadMore={onLoadMore}
        />,
      );
      await Promise.resolve();
    });
    return container;
  }

  it('shows the exhausted state after the loader reaches its last page', async () => {
    const onLoadMore = vi.fn(async () => ({ kind: 'exhausted' as const }));
    const container = await renderFeed(onLoadMore);

    expect(onLoadMore).toHaveBeenCalledOnce();
    expect(container.textContent).toContain('已加载全部内容');
  });

  it('offers a manual retry after a retryable load failure', async () => {
    const results: FeedLoadResult[] = [
      { kind: 'failed', retryable: true },
      { kind: 'exhausted' },
    ];
    const onLoadMore = vi.fn(async () => results.shift()!);
    const container = await renderFeed(onLoadMore);
    const retry = Array.from(container.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('点击重试'));

    expect(retry).toBeDefined();
    await act(async () => retry?.click());

    expect(onLoadMore).toHaveBeenCalledTimes(2);
    expect(container.textContent).toContain('已加载全部内容');
  });

  it('restores a persisted seen marker', async () => {
    storedValues[getSeenFeedItemStorageKey(feedItem())] = true;
    const container = await renderFeed(async () => ({ kind: 'exhausted' }));

    expect(container.querySelector('.feed-card')?.getAttribute('data-seen')).toBe('true');
    expect(container.textContent).toContain('已看过');
  });

  it('marks a card only when the user opens its detail', async () => {
    const container = await renderFeed(async () => ({ kind: 'exhausted' }));
    const card = container.querySelector('.feed-card');
    const detailLink = container.querySelector<HTMLAnchorElement>('.card-detail-link');

    expect(chrome.storage.local.set).not.toHaveBeenCalledWith({
      [getSeenFeedItemStorageKey(feedItem())]: true,
    });

    await act(async () => detailLink?.click());
    expect(chrome.storage.local.set).toHaveBeenCalledWith({
      [getSeenFeedItemStorageKey(feedItem())]: true,
    });
    expect(card?.getAttribute('data-seen')).toBe('true');
    expect(container.textContent).toContain('已看过');
  });
});
