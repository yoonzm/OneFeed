import type { FeedActionKind, FeedItem, FeedMetricKind } from '../types/feed';

export type FeedSortField = 'publishedAt' | 'reactions' | 'replies' | 'bookmarks';
export type FeedSortDirection = 'ascending' | 'descending';

export type FeedSort =
  | { field: 'original' }
  | { field: FeedSortField; direction: FeedSortDirection };

const SORT_FIELDS: readonly FeedSortField[] = [
  'publishedAt',
  'reactions',
  'replies',
  'bookmarks',
];

function finiteValue(value: number | undefined): number | undefined {
  return value !== undefined && Number.isFinite(value) ? value : undefined;
}

function interactionValue(
  item: FeedItem,
  metricKind: FeedMetricKind,
  actionKind: FeedActionKind,
): number | undefined {
  const metricValue = item.metrics.find((metric) => metric.kind === metricKind)?.value;
  const actionValue = item.actions.find((action) => action.kind === actionKind)?.count;
  return finiteValue(metricValue) ?? finiteValue(actionValue);
}

/** 只把可可靠比较的数据纳入排序；相对时间等未归一化值继续保留原始位置。 */
export function getFeedSortValue(item: FeedItem, field: FeedSortField): number | undefined {
  if (field === 'publishedAt') {
    if (typeof item.publishedAt === 'number') return finiteValue(item.publishedAt);
    if (!item.publishedAt) return undefined;
    return finiteValue(Date.parse(item.publishedAt));
  }

  if (field === 'reactions') return interactionValue(item, 'reactions', 'react');
  if (field === 'replies') return interactionValue(item, 'replies', 'reply');

  return finiteValue(item.actions.find((action) => action.kind === 'bookmark')?.count);
}

export function getAvailableFeedSortFields(items: readonly FeedItem[]): FeedSortField[] {
  return SORT_FIELDS.filter((field) => (
    items.some((item) => getFeedSortValue(item, field) !== undefined)
  ));
}

/** 缺失排序数据的条目始终放在末尾；置顶内容保持在普通内容之前。 */
export function sortFeedItems(items: readonly FeedItem[], sort: FeedSort): FeedItem[] {
  if (sort.field === 'original') return [...items];

  return items
    .map((item, index) => ({
      item,
      index,
      value: getFeedSortValue(item, sort.field),
    }))
    .sort((left, right) => {
      const pinnedDifference = Number(Boolean(right.item.flags?.pinned)) -
        Number(Boolean(left.item.flags?.pinned));
      if (pinnedDifference) return pinnedDifference;

      if (left.value === undefined) return right.value === undefined ? left.index - right.index : 1;
      if (right.value === undefined) return -1;

      const valueDifference = sort.direction === 'ascending'
        ? left.value - right.value
        : right.value - left.value;
      return valueDifference || left.index - right.index;
    })
    .map(({ item }) => item);
}
