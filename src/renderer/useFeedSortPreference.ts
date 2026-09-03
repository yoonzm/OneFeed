import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_FEED_SORT,
  normalizeFeedSort,
  type FeedSort,
} from './feedSorting';

const FEED_SORT_PREFERENCE_KEY_PREFIX = 'onefeed.feedSort.v1';

interface FeedSortPreferenceState {
  key: string;
  sort: FeedSort;
  ready: boolean;
}

function getExtensionStorage(): typeof chrome.storage | undefined {
  return typeof chrome === 'undefined' || !chrome.storage ? undefined : chrome.storage;
}

export function getFeedSortPreferenceStorageKey(platformId: string): string {
  return `${FEED_SORT_PREFERENCE_KEY_PREFIX}.${platformId}`;
}

/** 每个平台独立保存列表排序，避免不同数据能力的平台互相覆盖选择。 */
export function useFeedSortPreference(platformId: string) {
  const storage = getExtensionStorage();
  const storageKey = useMemo(
    () => getFeedSortPreferenceStorageKey(platformId),
    [platformId],
  );
  const [state, setState] = useState<FeedSortPreferenceState>(() => ({
    key: storageKey,
    sort: DEFAULT_FEED_SORT,
    ready: !storage,
  }));
  const currentState = state.key === storageKey
    ? state
    : { key: storageKey, sort: DEFAULT_FEED_SORT, ready: !storage };

  useEffect(() => {
    if (!storage) return;
    let active = true;
    const handleStorageChange = (
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: string,
    ) => {
      if (areaName !== 'local' || !changes[storageKey]) return;
      setState({
        key: storageKey,
        sort: normalizeFeedSort(changes[storageKey].newValue),
        ready: true,
      });
    };

    storage.local.get({ [storageKey]: DEFAULT_FEED_SORT }, (stored) => {
      if (!active) return;
      setState({
        key: storageKey,
        sort: normalizeFeedSort(stored[storageKey]),
        ready: true,
      });
    });
    storage.onChanged.addListener(handleStorageChange);
    return () => {
      active = false;
      storage.onChanged.removeListener(handleStorageChange);
    };
  }, [storage, storageKey]);

  const saveSort = useCallback((sort: FeedSort) => {
    const nextSort = normalizeFeedSort(sort);
    setState({ key: storageKey, sort: nextSort, ready: true });
    storage?.local.set({ [storageKey]: nextSort });
  }, [storage, storageKey]);

  return {
    sort: currentState.sort,
    ready: currentState.ready,
    saveSort,
  };
}
