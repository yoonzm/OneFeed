import { useCallback, useEffect, useState } from 'react';

export type ColorScheme = 'light' | 'dark';

export const DEFAULT_COLOR_SCHEME: ColorScheme = 'light';

export function normalizeColorScheme(value: unknown): ColorScheme {
  return value === 'dark' ? 'dark' : DEFAULT_COLOR_SCHEME;
}

export function useColorScheme(initialColorScheme = DEFAULT_COLOR_SCHEME) {
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>(initialColorScheme);
  const [ready, setReady] = useState(() => (
    typeof chrome === 'undefined' || !chrome.storage
  ));

  useEffect(() => {
    const storage = typeof chrome === 'undefined' || !chrome.storage
      ? undefined
      : chrome.storage;
    if (!storage) return;

    let active = true;
    const handleStorageChange = (
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: string,
    ) => {
      if (areaName !== 'local' || !changes.colorScheme) return;
      setColorSchemeState(normalizeColorScheme(changes.colorScheme.newValue));
    };

    storage.local.get(
      { colorScheme: initialColorScheme },
      ({ colorScheme: storedColorScheme }) => {
        if (!active) return;
        setColorSchemeState(normalizeColorScheme(storedColorScheme));
        setReady(true);
      },
    );
    storage.onChanged.addListener(handleStorageChange);

    return () => {
      active = false;
      storage.onChanged.removeListener(handleStorageChange);
    };
  }, [initialColorScheme]);

  const setColorScheme = useCallback((nextColorScheme: ColorScheme) => {
    setColorSchemeState(nextColorScheme);
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ colorScheme: nextColorScheme });
    }
  }, []);

  return { colorScheme, ready, setColorScheme };
}
