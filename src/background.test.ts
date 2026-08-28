import { afterEach, describe, expect, it, vi } from 'vitest';

type ActionClickListener = () => void;
type InstalledListener = (details: { reason: string }) => void;
type RuntimeMessageListener = (message: unknown) => void;
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
  let installedListener: InstalledListener | undefined;
  let runtimeMessageListener: RuntimeMessageListener | undefined;
  let storageChangeListener: StorageChangeListener | undefined;

  const setTitle = vi.fn();
  const setBadgeText = vi.fn();
  const setBadgeBackgroundColor = vi.fn();
  const createTab = vi.fn();
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
      getURL: vi.fn((path: string) => `chrome-extension://onefeed${path}`),
      onInstalled: {
        addListener: vi.fn((listener: InstalledListener) => {
          installedListener = listener;
        }),
      },
      onMessage: {
        addListener: vi.fn((listener: RuntimeMessageListener) => {
          runtimeMessageListener = listener;
        }),
      },
      onStartup: { addListener: vi.fn() },
    },
    tabs: {
      create: createTab,
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
    installed: (reason: string) => installedListener?.({ reason }),
    runtimeMessage: (message: unknown) => runtimeMessageListener?.(message),
    createTab,
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

  it('shows an OFF badge and paused status in the launch-center title', async () => {
    const chromeMock = createChromeMock(false);

    await startBackground();

    expect(chromeMock.setTitle).toHaveBeenLastCalledWith({
      title: '打开 OneFeed 启动中心（已暂停）',
    });
    expect(chromeMock.setBadgeText).toHaveBeenLastCalledWith({ text: 'OFF' });
    expect(chromeMock.setBadgeBackgroundColor).toHaveBeenCalledWith({ color: '#5f6b7e' });
  });

  it('opens the launch center when the toolbar icon is clicked', async () => {
    const chromeMock = createChromeMock(true);
    await startBackground();

    chromeMock.actionClick();

    expect(chromeMock.createTab).toHaveBeenCalledWith({
      url: 'chrome-extension://onefeed/board.html',
    });
    expect(chromeMock.set).not.toHaveBeenCalledWith({ enabled: false });
  });

  it('opens settings when the header sends the options message', async () => {
    const chromeMock = createChromeMock(true);
    await startBackground();

    chromeMock.runtimeMessage({ type: 'onefeed:open-options' });

    expect(chromeMock.createTab).toHaveBeenCalledWith({
      url: 'chrome-extension://onefeed/options.html',
    });
  });

  it('keeps toolbar feedback in sync with the page toggle', async () => {
    const chromeMock = createChromeMock(false);
    await startBackground();

    chromeMock.storageChange(true);

    expect(chromeMock.setTitle).toHaveBeenLastCalledWith({
      title: '打开 OneFeed 启动中心（已开启）',
    });
    expect(chromeMock.setBadgeText).toHaveBeenLastCalledWith({ text: '' });
  });

  it('opens onboarding only after a first install', async () => {
    const chromeMock = createChromeMock(true);
    await startBackground();

    chromeMock.installed('install');

    expect(chromeMock.createTab).toHaveBeenCalledWith({
      url: 'chrome-extension://onefeed/onboarding.html',
    });

    chromeMock.createTab.mockClear();
    chromeMock.installed('update');

    expect(chromeMock.createTab).not.toHaveBeenCalled();
  });
});
