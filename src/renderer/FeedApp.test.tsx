import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FeedItem, FeedLoadResult } from '../types/feed';
import FeedApp from './FeedApp';
import { useFeedStore } from './store/useFeedStore';

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

describe('FeedApp loading state', () => {
  let root: Root | undefined;

  beforeEach(() => {
    useFeedStore.getState().addFeedItems([feedItem()]);
    vi.stubGlobal('IntersectionObserver', undefined);
    vi.stubGlobal('chrome', {
      storage: {
        local: {
          get: vi.fn((_defaults, callback) => callback({ colorScheme: 'light' })),
          set: vi.fn(),
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
});
