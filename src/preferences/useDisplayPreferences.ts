import { useCallback, useEffect, useState } from 'react';
import {
  DEFAULT_DISPLAY_PREFERENCES,
  DISPLAY_PREFERENCES_KEY,
  normalizeDisplayPreferences,
  type DisplayPreferences,
} from './displayPreferences';

type DisplayPreferencesUpdate = DisplayPreferences | (
  (current: DisplayPreferences) => DisplayPreferences
);

function getExtensionStorage(): typeof chrome.storage | undefined {
  return typeof chrome === 'undefined' || !chrome.storage ? undefined : chrome.storage;
}

export function useDisplayPreferences() {
  const storage = getExtensionStorage();
  const [preferences, setPreferences] = useState<DisplayPreferences>(() => (
    normalizeDisplayPreferences(DEFAULT_DISPLAY_PREFERENCES)
  ));
  const [ready, setReady] = useState(!storage);

  useEffect(() => {
    if (!storage) return;
    let active = true;
    const handleStorageChange = (
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: string,
    ) => {
      if (areaName !== 'local' || !changes[DISPLAY_PREFERENCES_KEY]) return;
      setPreferences(normalizeDisplayPreferences(changes[DISPLAY_PREFERENCES_KEY].newValue));
    };

    storage.local.get(
      { [DISPLAY_PREFERENCES_KEY]: DEFAULT_DISPLAY_PREFERENCES },
      (stored) => {
        if (!active) return;
        setPreferences(normalizeDisplayPreferences(stored[DISPLAY_PREFERENCES_KEY]));
        setReady(true);
      },
    );
    storage.onChanged.addListener(handleStorageChange);
    return () => {
      active = false;
      storage.onChanged.removeListener(handleStorageChange);
    };
  }, [storage]);

  const savePreferences = useCallback((update: DisplayPreferencesUpdate) => {
    setPreferences((current) => {
      const next = normalizeDisplayPreferences(
        typeof update === 'function' ? update(current) : update,
      );
      storage?.local.set({ [DISPLAY_PREFERENCES_KEY]: next });
      return next;
    });
  }, [storage]);

  return { preferences, ready, savePreferences };
}
