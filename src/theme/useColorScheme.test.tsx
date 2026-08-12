import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  normalizeColorScheme,
  useColorScheme,
} from './useColorScheme';

type StorageListener = (
  changes: Record<string, chrome.storage.StorageChange>,
  areaName: string,
) => void;

function ColorSchemeHarness() {
  const { colorScheme, setColorScheme } = useColorScheme();

  return (
    <button type="button" onClick={() => setColorScheme('dark')}>
      {colorScheme}
    </button>
  );
}

describe('color scheme preference', () => {
  let listener: StorageListener | undefined;
  let root: Root | undefined;

  beforeEach(() => {
    vi.stubGlobal('chrome', {
      storage: {
        local: {
          get: vi.fn((_defaults, callback) => callback({ colorScheme: 'light' })),
          set: vi.fn(),
        },
        onChanged: {
          addListener: vi.fn((nextListener: StorageListener) => {
            listener = nextListener;
          }),
          removeListener: vi.fn(),
        },
      },
    });
  });

  afterEach(async () => {
    if (root) await act(async () => root?.unmount());
    root = undefined;
    listener = undefined;
    vi.unstubAllGlobals();
  });

  it('falls back to light for unknown stored values', () => {
    expect(normalizeColorScheme('dark')).toBe('dark');
    expect(normalizeColorScheme('system')).toBe('light');
    expect(normalizeColorScheme(undefined)).toBe('light');
  });

  it('persists local changes and follows changes from another surface', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => root?.render(<ColorSchemeHarness />));
    const button = container.querySelector('button');
    expect(button?.textContent).toBe('light');

    await act(async () => button?.click());
    expect(button?.textContent).toBe('dark');
    expect(chrome.storage.local.set).toHaveBeenCalledWith({ colorScheme: 'dark' });

    await act(async () => listener?.(
      { colorScheme: { oldValue: 'dark', newValue: 'light' } },
      'local',
    ));
    expect(button?.textContent).toBe('light');
  });
});
