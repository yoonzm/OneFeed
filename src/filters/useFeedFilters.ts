import { useCallback, useEffect, useState } from 'react';
import {
  DEFAULT_FEED_FILTER_SETTINGS,
  FEED_FILTER_SETTINGS_KEY,
  normalizeFeedFilterSettings,
  type FeedFilterSettings,
} from './feedFilters';

type FeedFilterSettingsUpdate = FeedFilterSettings | (
  (current: FeedFilterSettings) => FeedFilterSettings
);

function getExtensionStorage(): typeof chrome.storage | undefined {
  return typeof chrome === 'undefined' || !chrome.storage ? undefined : chrome.storage;
}

export function useFeedFilters() {
  const storage = getExtensionStorage();
  const [settings, setSettings] = useState<FeedFilterSettings>(() => (
    normalizeFeedFilterSettings(DEFAULT_FEED_FILTER_SETTINGS)
  ));
  const [ready, setReady] = useState(!storage);

  useEffect(() => {
    if (!storage) return;
    let active = true;
    const handleStorageChange = (
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: string,
    ) => {
      if (areaName !== 'local' || !changes[FEED_FILTER_SETTINGS_KEY]) return;
      setSettings(normalizeFeedFilterSettings(changes[FEED_FILTER_SETTINGS_KEY].newValue));
    };

    storage.local.get(
      { [FEED_FILTER_SETTINGS_KEY]: DEFAULT_FEED_FILTER_SETTINGS },
      (stored) => {
        if (!active) return;
        setSettings(normalizeFeedFilterSettings(stored[FEED_FILTER_SETTINGS_KEY]));
        setReady(true);
      },
    );
    storage.onChanged.addListener(handleStorageChange);
    return () => {
      active = false;
      storage.onChanged.removeListener(handleStorageChange);
    };
  }, [storage]);

  const saveSettings = useCallback((update: FeedFilterSettingsUpdate) => {
    setSettings((current) => {
      const next = normalizeFeedFilterSettings(
        typeof update === 'function' ? update(current) : update,
      );
      storage?.local.set({ [FEED_FILTER_SETTINGS_KEY]: next });
      return next;
    });
  }, [storage]);

  return { settings, ready, saveSettings };
}
