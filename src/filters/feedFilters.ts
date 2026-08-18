import type { ContentKind, FeedBlock, FeedItem } from '../types/feed';

export const FEED_FILTER_SETTINGS_KEY = 'onefeed.feedFilters.v1';

export type TextFilterField = 'all' | 'title' | 'content';
export type AuthorFilterOperator = 'contains' | 'equals';

export type FeedFilterCondition =
  | {
      type: 'keyword';
      field: TextFilterField;
      values: string[];
    }
  | {
      type: 'author';
      operator: AuthorFilterOperator;
      value: string;
    }
  | {
      type: 'kind';
      value: ContentKind;
    };

export interface FeedFilterRule {
  id: string;
  name: string;
  enabled: boolean;
  platformIds?: string[];
  conditions: FeedFilterCondition[];
  action: 'hide';
}

export interface FeedFilterSettings {
  version: 1;
  enabled: boolean;
  hideSeen: boolean;
  hideRecommended: boolean;
  rules: FeedFilterRule[];
}

export interface FeedFilterMatch {
  item: FeedItem;
  reasons: string[];
}

export interface FeedFilterResult {
  visibleItems: FeedItem[];
  hiddenItems: FeedFilterMatch[];
}

export interface FeedFilterContext {
  isSeen: (item: FeedItem) => boolean;
}

export const DEFAULT_FEED_FILTER_SETTINGS: FeedFilterSettings = {
  version: 1,
  enabled: true,
  hideSeen: false,
  hideRecommended: false,
  rules: [],
};

const CONTENT_KINDS: readonly ContentKind[] = ['post', 'article', 'discussion'];
const TEXT_FIELDS: readonly TextFilterField[] = ['all', 'title', 'content'];
const AUTHOR_OPERATORS: readonly AuthorFilterOperator[] = ['contains', 'equals'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter(Boolean))];
}

function normalizeCondition(value: unknown): FeedFilterCondition | undefined {
  if (!isRecord(value)) return undefined;

  if (value.type === 'keyword') {
    const field = typeof value.field === 'string' &&
      TEXT_FIELDS.includes(value.field as TextFilterField)
      ? value.field as TextFilterField
      : 'all';
    const values = normalizeStringList(value.values);
    return values.length ? { type: 'keyword', field, values } : undefined;
  }

  if (value.type === 'author') {
    const authorValue = typeof value.value === 'string' ? value.value.trim() : '';
    if (!authorValue) return undefined;
    const operator = typeof value.operator === 'string' &&
      AUTHOR_OPERATORS.includes(value.operator as AuthorFilterOperator)
      ? value.operator as AuthorFilterOperator
      : 'contains';
    return { type: 'author', operator, value: authorValue };
  }

  if (value.type === 'kind' && typeof value.value === 'string' &&
    CONTENT_KINDS.includes(value.value as ContentKind)) {
    return { type: 'kind', value: value.value as ContentKind };
  }

  return undefined;
}

function normalizeRule(value: unknown): FeedFilterRule | undefined {
  if (!isRecord(value) || typeof value.id !== 'string' || !value.id.trim()) return undefined;
  const conditions = Array.isArray(value.conditions)
    ? value.conditions.map(normalizeCondition).filter((condition) => condition !== undefined)
    : [];
  if (!conditions.length) return undefined;

  const platformIds = normalizeStringList(value.platformIds);
  return {
    id: value.id.trim(),
    name: typeof value.name === 'string' && value.name.trim()
      ? value.name.trim()
      : '未命名规则',
    enabled: value.enabled !== false,
    ...(platformIds.length ? { platformIds } : {}),
    conditions,
    action: 'hide',
  };
}

export function normalizeFeedFilterSettings(value: unknown): FeedFilterSettings {
  if (!isRecord(value)) return { ...DEFAULT_FEED_FILTER_SETTINGS, rules: [] };
  const rules = Array.isArray(value.rules)
    ? value.rules.map(normalizeRule).filter((rule) => rule !== undefined)
    : [];

  return {
    version: 1,
    enabled: value.enabled !== false,
    hideSeen: value.hideSeen === true,
    hideRecommended: value.hideRecommended === true,
    rules,
  };
}

/** 文本规则使用同一套规范化，避免大小写、全半角和连续空白造成意外漏匹配。 */
export function normalizeFilterText(value: string): string {
  return value.normalize('NFKC').toLocaleLowerCase().replace(/\s+/g, ' ').trim();
}

function blockText(block: FeedBlock): string[] {
  switch (block.type) {
    case 'richText':
      return [block.plainText];
    case 'gallery':
      return block.items.map((item) => item.alt);
    case 'video':
      return [block.media.alt || ''];
    case 'linkPreview':
      return [
        block.preview.title || '',
        block.preview.description || '',
        block.preview.siteName || '',
      ];
    case 'quote':
      return [block.item.title || '', block.item.text || '', block.item.author.name];
    case 'poll':
      return [
        block.poll.question || '',
        ...block.poll.options.map((option) => option.label),
      ];
  }
}

function searchableText(item: FeedItem, field: TextFilterField): string {
  const title = item.title || '';
  const content = item.previewBlocks.flatMap(blockText).join(' ');
  if (field === 'title') return normalizeFilterText(title);
  if (field === 'content') return normalizeFilterText(content);
  return normalizeFilterText(`${title} ${content}`);
}

export function conditionMatchesItem(condition: FeedFilterCondition, item: FeedItem): boolean {
  if (condition.type === 'keyword') {
    const text = searchableText(item, condition.field);
    return Boolean(text) && condition.values.some((value) => (
      text.includes(normalizeFilterText(value))
    ));
  }

  if (condition.type === 'author') {
    const author = normalizeFilterText(item.author.name);
    const expected = normalizeFilterText(condition.value);
    if (!author || !expected) return false;
    return condition.operator === 'equals' ? author === expected : author.includes(expected);
  }

  return item.kind === condition.value;
}

export function ruleMatchesItem(rule: FeedFilterRule, item: FeedItem): boolean {
  if (!rule.enabled) return false;
  if (rule.platformIds?.length && !rule.platformIds.includes(item.platform)) return false;
  return rule.conditions.length > 0 && rule.conditions.every((condition) => (
    conditionMatchesItem(condition, item)
  ));
}

export function filterFeedItems(
  items: readonly FeedItem[],
  settings: FeedFilterSettings,
  context: FeedFilterContext,
): FeedFilterResult {
  if (!settings.enabled) return { visibleItems: [...items], hiddenItems: [] };

  const visibleItems: FeedItem[] = [];
  const hiddenItems: FeedFilterMatch[] = [];
  items.forEach((item) => {
    const reasons: string[] = [];
    if (settings.hideSeen && context.isSeen(item)) reasons.push('已读内容');
    if (settings.hideRecommended && item.context?.reason?.type === 'recommended') {
      reasons.push('平台推荐内容');
    }
    settings.rules.forEach((rule) => {
      if (ruleMatchesItem(rule, item)) reasons.push(rule.name);
    });

    if (reasons.length) hiddenItems.push({ item, reasons: [...new Set(reasons)] });
    else visibleItems.push(item);
  });

  return { visibleItems, hiddenItems };
}
