import { afterEach, describe, expect, it, vi } from 'vitest';

type ActionClickListener = () => void;
type StorageChangeListener = (
  changes: Record<string, { newValue?: unknown }>,
  areaName: string,
) => void;

function createChromeMock(initialEnabled: boolean) {
  const stored: Record<string, boolean | string> = {
    enabled: initialEnabled,
    theme: 'focus-paper',
    colorScheme: 'light',
  };
  let actionClickListener: ActionClickListener | undefined;
  let storageChangeListener: StorageChangeListener | undefined;

  const setTitle = vi.fn();
  const setBadgeText = vi.fn();
  const setBadgeBackgroundColor = vi.fn();
  const set = vi.fn((values: Record<string, boolean | string>) => {
    Object.assign(stored, values);
  });

  vi.stubGlobal('chrome', {
    action: {
      onClicked: {
        addListener: vi.fn((listener: ActionClickListener) => {
          actionClickListener = listener;
        }),
      },
      setTitle,
      setBadgeText,
      setBadgeBackgroundColor,
    },
    runtime: {
      onInstalled: { addListener: vi.fn() },
      onStartup: { addListener: vi.fn() },
    },
    storage: {
      local: {
        get: vi.fn((query: string[] | { enabled: boolean }, callback: (
          values: Record<string, boolean | string>,
        ) => void) => {
          callback(Array.isArray(query) ? stored : { enabled: stored.enabled as boolean });
        }),
        set,
      },
      onChanged: {
        addListener: vi.fn((listener: StorageChangeListener) => {
          storageChangeListener = listener;
        }),
      },
    },
  });
  vi.stubGlobal('defineBackground', (definition: unknown) => definition);

  return {
    actionClick: () => actionClickListener?.(),
    storageChange: (enabled: boolean) => storageChangeListener?.(
      { enabled: { newValue: enabled } },
      'local',
    ),
    set,
    setBadgeBackgroundColor,
    setBadgeText,
    setTitle,
  };
}

async function startBackground() {
  const background = await import('./entrypoints/background');
  (background.default as { main: () => void }).main();
}

describe('toolbar action state', () => {
  afterEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('shows an OFF badge and resume title when OneFeed is paused', async () => {
    const chromeMock = createChromeMock(false);

    await startBackground();

    expect(chromeMock.setTitle).toHaveBeenLastCalledWith({
      title: 'OneFeed 已暂停，点击开启',
    });
    expect(chromeMock.setBadgeText).toHaveBeenLastCalledWith({ text: 'OFF' });
    expect(chromeMock.setBadgeBackgroundColor).toHaveBeenCalledWith({ color: '#5f6b7e' });
  });

  it('toggles the global enabled setting when the toolbar icon is clicked', async () => {
    const chromeMock = createChromeMock(true);
    await startBackground();

    chromeMock.actionClick();

    expect(chromeMock.set).toHaveBeenCalledWith({ enabled: false });
  });

  it('keeps toolbar feedback in sync with the page toggle', async () => {
    const chromeMock = createChromeMock(false);
    await startBackground();

    chromeMock.storageChange(true);

    expect(chromeMock.setTitle).toHaveBeenLastCalledWith({
      title: 'OneFeed 已开启，点击暂停',
    });
    expect(chromeMock.setBadgeText).toHaveBeenLastCalledWith({ text: '' });
  });
});
