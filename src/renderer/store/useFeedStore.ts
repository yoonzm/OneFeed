import { create } from 'zustand';
import type { FeedItem } from '../../types/feed';

interface FeedState {
  items: FeedItem[];
  addFeedItems: (items: FeedItem[]) => void;
  clear: () => void;
}

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

export const useFeedStore = create<FeedState>((set) => ({
  items: [],
  addFeedItems: (items) => set((state) => ({ items: mergeFeedItems(state.items, items) })),
  clear: () => set({ items: [] }),
}));
