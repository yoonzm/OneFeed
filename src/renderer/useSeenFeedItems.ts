import { useCallback, useEffect, useRef, useState } from 'react';
import type { FeedItem } from '../types/feed';

const SEEN_FEED_ITEM_STORAGE_PREFIX = 'onefeed.seenFeedItem.';

export function getSeenFeedItemKey(item: Pick<FeedItem, 'id' | 'platform'>): string {
  return `${encodeURIComponent(item.platform)}:${encodeURIComponent(item.id)}`;
}

export function getSeenFeedItemStorageKey(
  item: Pick<FeedItem, 'id' | 'platform'>,
): string {
  return `${SEEN_FEED_ITEM_STORAGE_PREFIX}${getSeenFeedItemKey(item)}`;
}

function getExtensionStorage(): typeof chrome.storage | undefined {
  return typeof chrome === 'undefined' || !chrome.storage ? undefined : chrome.storage;
}

function readSeenFeedItemKeys(stored: Record<string, unknown>): Set<string> {
  return new Set(
    Object.entries(stored)
      .filter(([key, value]) => key.startsWith(SEEN_FEED_ITEM_STORAGE_PREFIX) && value === true)
      .map(([key]) => key.slice(SEEN_FEED_ITEM_STORAGE_PREFIX.length)),
  );
}

/**
 * 已看状态按条目独立持久化，避免多个站点标签页同时写入一个数组时互相覆盖。
 * Feed 过滤仍留在 Renderer 层，Adapter 只负责描述内容本身。
 */
export function useSeenFeedItems() {
  const storage = getExtensionStorage();
  const [seenItemKeys, setSeenItemKeys] = useState<ReadonlySet<string>>(() => new Set());
  const seenItemKeysRef = useRef(seenItemKeys);

  useEffect(() => {
    if (!storage) return;

    let active = true;
    const handleStorageChange = (
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: string,
    ) => {
      if (areaName !== 'local') return;

      const relevantChanges = Object.entries(changes)
        .filter(([key]) => key.startsWith(SEEN_FEED_ITEM_STORAGE_PREFIX));
      if (!relevantChanges.length) return;

      setSeenItemKeys((current) => {
        const next = new Set(current);
        relevantChanges.forEach(([storageKey, change]) => {
          const itemKey = storageKey.slice(SEEN_FEED_ITEM_STORAGE_PREFIX.length);
          if (change.newValue === true) next.add(itemKey);
          else next.delete(itemKey);
        });
        seenItemKeysRef.current = next;
        return next;
      });
    };

    storage.local.get(null, (stored) => {
      if (!active) return;
      const storedItemKeys = readSeenFeedItemKeys(stored);
      setSeenItemKeys((current) => {
        const next = new Set([...storedItemKeys, ...current]);
        seenItemKeysRef.current = next;
        return next;
      });
    });
    storage.onChanged.addListener(handleStorageChange);

    return () => {
      active = false;
      storage.onChanged.removeListener(handleStorageChange);
    };
  }, [storage]);

  const markSeen = useCallback((itemKey: string) => {
    if (seenItemKeysRef.current.has(itemKey)) return;

    const next = new Set(seenItemKeysRef.current);
    next.add(itemKey);
    seenItemKeysRef.current = next;
    setSeenItemKeys(next);
    storage?.local.set({ [`${SEEN_FEED_ITEM_STORAGE_PREFIX}${itemKey}`]: true });
  }, [storage]);

  return { markSeen, seenItemKeys };
}
