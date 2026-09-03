import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_FEED_FILTER_SETTINGS,
  FEED_FILTER_SETTINGS_KEY,
} from '../filters/feedFilters';
import type { FeedItem, FeedLoadResult } from '../types/feed';
import FeedApp from './FeedApp';
import { useFeedStore } from './store/useFeedStore';
import { getFeedSortPreferenceStorageKey } from './useFeedSortPreference';
import { getSeenFeedItemStorageKey } from './useSeenFeedItems';

function feedItem(overrides: Partial<FeedItem> = {}): FeedItem {
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
    ...overrides,
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

  it('shows only a quiet hidden count without auto-loading when every item is filtered', async () => {
    storedValues[FEED_FILTER_SETTINGS_KEY] = {
      ...DEFAULT_FEED_FILTER_SETTINGS,
      rules: [{
        id: 'author-rule',
        name: '测试作者',
        enabled: true,
        conditions: [{ type: 'author', operator: 'equals', value: '测试用户' }],
        action: 'hide',
      }],
    };
    const onLoadMore = vi.fn(async () => ({ kind: 'exhausted' as const }));
    const container = await renderFeed(onLoadMore);

    expect(container.querySelector('.feed-card')).toBeNull();
    const hiddenStatus = container.querySelector('[role="status"][aria-label="已隐藏 1 条内容"]');
    expect(hiddenStatus?.querySelector('svg')).not.toBeNull();
    expect(hiddenStatus?.textContent).toBe('1');
    expect(container.textContent).not.toContain('临时显示');
    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it('sorts the visible loaded items from the inline list control', async () => {
    useFeedStore.setState({
      items: [
        feedItem({
          id: 'low',
          title: '较少点赞',
          metrics: [{ kind: 'reactions', value: 2 }],
        }),
        feedItem({
          id: 'high',
          title: '较多点赞',
          metrics: [{ kind: 'reactions', value: 20 }],
        }),
      ],
    });
    const container = await renderFeed(async () => ({ kind: 'exhausted' }));
    const sortTrigger = container.querySelector<HTMLButtonElement>(
      '[aria-label="当前排序：原始顺序"]',
    );

    expect(sortTrigger).not.toBeNull();
    expect(sortTrigger?.closest('header')).not.toBeNull();
    expect(sortTrigger?.className).toContain('size-8');
    expect(Array.from(container.querySelectorAll('.feed-card h2')).map((title) => title.textContent))
      .toEqual(['较少点赞', '较多点赞']);

    await act(async () => sortTrigger?.click());
    const descendingLikes = container.querySelector<HTMLButtonElement>(
      '[role="menuitemradio"][aria-label="点赞 · 从高到低"]',
    );
    await act(async () => descendingLikes?.click());

    expect(Array.from(container.querySelectorAll('.feed-card h2')).map((title) => title.textContent))
      .toEqual(['较多点赞', '较少点赞']);
    expect(sortTrigger?.getAttribute('aria-label')).toBe('当前排序：点赞 · 从高到低');
    expect(sortTrigger?.className).toContain('text-onefeed-blue');
    expect(chrome.storage.local.set).toHaveBeenCalledWith({
      [getFeedSortPreferenceStorageKey('zhihu')]: {
        field: 'reactions',
        direction: 'descending',
      },
    });
  });

  it('restores the saved sort for the active platform', async () => {
    storedValues[getFeedSortPreferenceStorageKey('zhihu')] = {
      field: 'reactions',
      direction: 'descending',
    };
    useFeedStore.setState({
      items: [
        feedItem({
          id: 'low',
          title: '较少点赞',
          metrics: [{ kind: 'reactions', value: 2 }],
        }),
        feedItem({
          id: 'high',
          title: '较多点赞',
          metrics: [{ kind: 'reactions', value: 20 }],
        }),
      ],
    });

    const container = await renderFeed(async () => ({ kind: 'exhausted' }));

    expect(Array.from(container.querySelectorAll('.feed-card h2')).map((title) => title.textContent))
      .toEqual(['较多点赞', '较少点赞']);
    expect(container.querySelector('[aria-label="当前排序：点赞 · 从高到低"]'))
      .not.toBeNull();
  });
});
