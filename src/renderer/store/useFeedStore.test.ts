import { describe, expect, it } from 'vitest';
import type { FeedItem } from '../../types/feed';
import { mergeFeedItems } from './useFeedStore';

function item(id: string, likes = 1): FeedItem {
  return {
    id,
    platform: 'zhihu',
    originalUrl: 'https://www.zhihu.com/',
    author: { name: '测试用户', avatar: '' },
    contentHtml: '<p>内容</p>',
    stats: { likes, comments: 0 },
  };
}

describe('mergeFeedItems', () => {
  it('deduplicates by id while keeping order and updating values', () => {
    const merged = mergeFeedItems([item('a'), item('b')], [item('a', 9), item('c')]);
    expect(merged.map((entry) => entry.id)).toEqual(['a', 'b', 'c']);
    expect(merged[0]!.stats.likes).toBe(9);
  });
});
