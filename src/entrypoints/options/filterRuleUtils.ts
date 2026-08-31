import {
  getPlatformDisplayName,
  getSupportedPlatforms,
  type PlatformId,
} from '../../config/platforms';
import type { FeedFilterCondition, FeedFilterRule } from '../../filters/feedFilters';
import { i18n } from '../../i18n';

const KIND_LABELS = {
  post: i18n.t('filter.kind.post'),
  article: i18n.t('filter.kind.article'),
  discussion: i18n.t('filter.kind.discussion'),
} as const;

const TEXT_FIELD_LABELS = {
  all: i18n.t('filter.field.all'),
  title: i18n.t('filter.field.title'),
  content: i18n.t('filter.field.content'),
} as const;

export function createRuleId(): string {
  return globalThis.crypto?.randomUUID?.() ||
    `rule-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createRule(): FeedFilterRule {
  return {
    id: createRuleId(),
    name: '',
    enabled: true,
    conditions: [{ type: 'keyword', field: 'all', values: [''] }],
    action: 'hide',
  };
}

export function createCondition(
  type: FeedFilterCondition['type'],
): FeedFilterCondition {
  if (type === 'author') return { type: 'author', operator: 'contains', value: '' };
  if (type === 'kind') return { type: 'kind', value: 'article' };
  return { type: 'keyword', field: 'all', values: [''] };
}

export function conditionSummary(condition: FeedFilterCondition): string {
  if (condition.type === 'keyword') {
    return i18n.t('filter.summaryKeyword', {
      field: TEXT_FIELD_LABELS[condition.field],
      value: condition.values.filter(Boolean).join(', '),
    });
  }
  if (condition.type === 'author') {
    return i18n.t(
      condition.operator === 'equals'
        ? 'filter.summaryAuthorEquals'
        : 'filter.summaryAuthorContains',
      { value: condition.value },
    );
  }
  return i18n.t('filter.summaryKind', { kind: KIND_LABELS[condition.value] });
}

export function ruleSummary(rule: FeedFilterRule): string {
  const scope = rule.platformIds?.length
    ? rule.platformIds.map((id) => (
        getSupportedPlatforms().find((platform) => platform.id === id)
          ? getPlatformDisplayName(id as PlatformId)
          : id
      )).join(' · ')
    : i18n.t('filter.allPlatforms');
  return i18n.t('filter.ruleSummary', {
    scope,
    conditions: rule.conditions.map(conditionSummary).join(i18n.t('filter.conditionSeparator')),
  });
}

export function ruleValidationError(rule: FeedFilterRule): string | undefined {
  if (!rule.conditions.length) return i18n.t('filter.validationCondition');
  const invalid = rule.conditions.some((condition) => {
    if (condition.type === 'keyword') return !condition.values.some((value) => value.trim());
    if (condition.type === 'author') return !condition.value.trim();
    return false;
  });
  return invalid ? i18n.t('filter.validationValue') : undefined;
}
