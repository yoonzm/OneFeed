import { describe, expect, it } from 'vitest';
import type { FeedItem } from '../types/feed';
import {
  getAvailableFeedSortFields,
  sortFeedItems,
} from './feedSorting';

function feedItem(id: string, overrides: Partial<FeedItem> = {}): FeedItem {
  return {
    id,
    platform: 'zhihu',
    source: { id: 'zhihu', name: '知乎' },
    originalUrl: `https://example.com/${id}`,
    kind: 'post',
    role: 'post',
    author: { name: '测试用户', avatar: '' },
    previewBlocks: [],
    metrics: [],
    actions: [],
    ...overrides,
  };
}

describe('feed sorting', () => {
  it('preserves the adapter order by default', () => {
    const items = [feedItem('first'), feedItem('second')];

    expect(sortFeedItems(items, { field: 'original' }).map((item) => item.id))
      .toEqual(['first', 'second']);
  });

  it('sorts comparable values while keeping pinned and missing-data items stable', () => {
    const items = [
      feedItem('missing'),
      feedItem('low', { metrics: [{ kind: 'reactions', value: 2 }] }),
      feedItem('pinned', {
        flags: { pinned: true },
        metrics: [{ kind: 'reactions', value: 1 }],
      }),
      feedItem('high', { metrics: [{ kind: 'reactions', value: 20 }] }),
    ];

    expect(sortFeedItems(items, {
      field: 'reactions',
      direction: 'descending',
    }).map((item) => item.id)).toEqual(['pinned', 'high', 'low', 'missing']);
  });

  it('derives available fields from normalized metrics and action counts', () => {
    const items = [
      feedItem('dated', { publishedAt: '2026-08-27T08:00:00Z' }),
      feedItem('counts', {
        actions: [
          { id: 'reply', kind: 'reply', label: '评论', count: 4, enabled: true },
          { id: 'bookmark', kind: 'bookmark', label: '收藏', count: 3, enabled: true },
        ],
      }),
    ];

    expect(getAvailableFeedSortFields(items))
      .toEqual(['publishedAt', 'replies', 'bookmarks']);
  });
});
