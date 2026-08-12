import { create } from 'zustand';
import type { FeedItem } from '../../types/feed';

interface FeedState {
  items: FeedItem[];
  addFeedItems: (items: FeedItem[]) => void;
  clear: () => void;
}

/**
 * 按稳定 id 合并 Adapter 的增量扫描结果。
 * 已有项目原位替换以保留列表顺序，新项目追加，避免 MutationObserver 重扫造成跳动。
 */
export function mergeFeedItems(current: FeedItem[], incoming: FeedItem[]): FeedItem[] {
  const next = [...current];
  const indexes = new Map(next.map((item, index) => [item.id, index]));

  incoming.forEach((item) => {
    const index = indexes.get(item.id);
    if (index === undefined) {
      indexes.set(item.id, next.length);
      next.push(item);
    } else {
      next[index] = item;
    }
  });

  return next;
}

/** Feed Surface 的短生命周期内存状态；Surface 卸载时由内容脚本调用 clear。 */
export const useFeedStore = create<FeedState>((set) => ({
  items: [],
  addFeedItems: (items) => set((state) => ({ items: mergeFeedItems(state.items, items) })),
  clear: () => set({ items: [] }),
}));
