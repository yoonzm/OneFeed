import { describe, expect, it } from 'vitest';
import type { FeedItem } from '../types/feed';
import {
  DEFAULT_FEED_FILTER_SETTINGS,
  filterFeedItems,
  normalizeFeedFilterSettings,
  ruleMatchesItem,
  type FeedFilterRule,
} from './feedFilters';

function item(overrides: Partial<FeedItem> = {}): FeedItem {
  return {
    id: 'item-1',
    platform: 'zhihu',
    source: { id: 'zhihu', name: '知乎' },
    originalUrl: 'https://example.com/item-1',
    kind: 'article',
    role: 'article',
    author: { name: '林一', avatar: '' },
    title: '如何保持专注',
    previewBlocks: [{ type: 'richText', html: '<p>减少信息噪音</p>', plainText: '减少信息噪音' }],
    metrics: [],
    actions: [],
    ...overrides,
  };
}

const focusedRule: FeedFilterRule = {
  id: 'rule-1',
  name: '知乎推广文章',
  enabled: true,
  platformIds: ['zhihu'],
  conditions: [
    { type: 'keyword', field: 'all', values: ['推广'] },
    { type: 'author', operator: 'equals', value: '品牌账号' },
  ],
  action: 'hide',
};

describe('feed filter engine', () => {
  it('requires every condition inside a rule and respects platform scope', () => {
    expect(ruleMatchesItem(focusedRule, item({
      title: '推广：新的阅读方式',
      author: { name: '品牌账号', avatar: '' },
    }))).toBe(true);
    expect(ruleMatchesItem(focusedRule, item({ title: '普通文章' }))).toBe(false);
    expect(ruleMatchesItem(focusedRule, item({
      platform: 'weibo',
      title: '推广：新的阅读方式',
      author: { name: '品牌账号', avatar: '' },
    }))).toBe(false);
  });

  it('hides an item when any enabled rule matches and reports every reason', () => {
    const target = item({
      title: '推广：新的阅读方式',
      author: { name: '品牌账号', avatar: '' },
      context: { reason: { type: 'recommended', label: '推荐' } },
    });
    const result = filterFeedItems([target, item({ id: 'item-2' })], {
      ...DEFAULT_FEED_FILTER_SETTINGS,
      hideRecommended: true,
      rules: [focusedRule],
    }, { isSeen: (entry) => entry.id === 'item-1' });

    expect(result.visibleItems.map((entry) => entry.id)).toEqual(['item-2']);
    expect(result.hiddenItems[0]!.reasons).toEqual(['平台推荐内容', '知乎推广文章']);
  });

  it('supports the existing seen state without coupling the engine to its storage key', () => {
    const target = item();
    const result = filterFeedItems([target], {
      ...DEFAULT_FEED_FILTER_SETTINGS,
      hideSeen: true,
    }, { isSeen: () => true });

    expect(result.hiddenItems).toEqual([{ item: target, reasons: ['已读内容'] }]);
  });

  it('normalizes full-width text and treats missing fields as non-matches', () => {
    const rule: FeedFilterRule = {
      id: 'keyword',
      name: 'AI',
      enabled: true,
      conditions: [{ type: 'keyword', field: 'content', values: ['ＡＩ NEWS'] }],
      action: 'hide',
    };

    expect(ruleMatchesItem(rule, item({
      previewBlocks: [{ type: 'richText', html: '', plainText: 'ai   news' }],
    }))).toBe(true);
    expect(ruleMatchesItem(rule, item({ previewBlocks: [] }))).toBe(false);
  });

  it('drops invalid persisted conditions instead of broadening a rule', () => {
    const settings = normalizeFeedFilterSettings({
      enabled: true,
      rules: [{ id: 'broken', name: 'Broken', conditions: [{ type: 'keyword', values: [] }] }],
    });

    expect(settings.rules).toEqual([]);
  });
});
