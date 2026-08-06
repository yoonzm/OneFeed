import { describe, expect, it } from 'vitest';
import type { FeedItem } from '../../types/feed';
import { mergeFeedItems } from './useFeedStore';

function item(id: string, likes = 1): FeedItem {
  return {
    id,
    platform: 'zhihu',
    source: { id: 'zhihu', name: '知乎' },
    originalUrl: 'https://www.zhihu.com/',
    kind: 'article',
    author: { name: '测试用户', avatar: '' },
    blocks: [{ type: 'richText', html: '<p>内容</p>', plainText: '内容' }],
    metrics: [{ kind: 'reactions', value: likes, label: '赞同' }],
    actions: [{
      id: 'react',
      kind: 'react',
      variant: 'agree',
      label: '赞同',
      count: likes,
      enabled: true,
    }],
  };
}

describe('mergeFeedItems', () => {
  it('deduplicates by id while keeping order and updating values', () => {
    const merged = mergeFeedItems([item('a'), item('b')], [item('a', 9), item('c')]);
    expect(merged.map((entry) => entry.id)).toEqual(['a', 'b', 'c']);
    expect(merged[0]!.metrics[0]?.value).toBe(9);
  });
});
