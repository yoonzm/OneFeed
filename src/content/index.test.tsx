import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createAdapter: vi.fn(),
  isSupportedUrl: vi.fn(),
  render: vi.fn(),
  storageAddListener: vi.fn(),
  storageGet: vi.fn(),
  storageRemoveListener: vi.fn(),
  unmountRoot: vi.fn(),
}));

vi.mock('react-dom/client', () => ({
  createRoot: vi.fn(() => ({
    render: mocks.render,
    unmount: mocks.unmountRoot,
  })),
}));

vi.mock('./adapters/registry', () => ({
  createAdapter: mocks.createAdapter,
  isSupportedUrl: mocks.isSupportedUrl,
}));

import { startContentScript } from './index';

function activeSurface(surface: 'feed' | 'article' | 'thread') {
  return {
    surface,
    source: { id: 'test', name: '测试站点', homeUrl: 'https://example.com/' },
    adapter: {
      init: vi.fn(),
      disconnect: vi.fn(),
      triggerAction: vi.fn(() => false),
      triggerFeedChannel: vi.fn(() => false),
      getInitialSearchQuery: vi.fn(() => undefined),
      triggerSearch: vi.fn(() => false),
      setFeedChannelsListener: vi.fn((listener) => listener([])),
      requestMore: vi.fn(async () => ({ kind: 'exhausted' as const })),
    },
  };
}

describe('content surface lifecycle', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/feed');
    mocks.createAdapter.mockReset();
    mocks.isSupportedUrl.mockReset().mockReturnValue(true);
    mocks.render.mockReset();
    mocks.storageAddListener.mockReset();
    mocks.storageGet.mockReset().mockImplementation((_defaults, callback) => (
      callback({ enabled: true })
    ));
    mocks.storageRemoveListener.mockReset();
    mocks.unmountRoot.mockReset();
    document.title = '原站标题';
    document.head.querySelectorAll('link[rel~="icon"]').forEach((icon) => icon.remove());
    vi.stubGlobal('chrome', {
      runtime: {
        getURL: vi.fn((path: string) => `chrome-extension://onefeed/${path}`),
      },
      storage: {
        local: {
          get: mocks.storageGet,
          set: vi.fn(),
        },
        onChanged: {
          addListener: mocks.storageAddListener,
          removeListener: mocks.storageRemoveListener,
        },
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.getElementById('__universal_feed_hide_original__')?.remove();
    document.getElementById('__universal_feed_root__')?.remove();
    document.getElementById('__universal_feed_toggle__')?.remove();
    document.head.querySelectorAll('link[rel~="icon"]').forEach((icon) => icon.remove());
    document.title = '';
    window.history.replaceState({}, '', '/');
  });

  it('hides a supported page before the async enabled setting resolves', () => {
    let resolveStorage: ((value: { enabled: boolean }) => void) | undefined;
    mocks.storageGet.mockImplementationOnce((_defaults, callback) => {
      resolveStorage = callback;
    });
    mocks.createAdapter.mockReturnValue(activeSurface('feed'));

    const controller = startContentScript();

    expect(document.getElementById('__universal_feed_hide_original__')).not.toBeNull();
    expect(document.title).toBe('OneFeed');
    expect(document.getElementById('__onefeed_tab_icon__')).not.toBeNull();
    expect(mocks.createAdapter).not.toHaveBeenCalled();

    resolveStorage?.({ enabled: false });
    expect(document.getElementById('__universal_feed_hide_original__')).toBeNull();
    expect(document.title).toBe('原站标题');
    expect(document.getElementById('__onefeed_tab_icon__')).toBeNull();
    expect(mocks.createAdapter).not.toHaveBeenCalled();
    controller.cleanup();
  });

  it.each(['article', 'thread'] as const)(
    'shows the dark %s loading surface when the stored theme resolves',
    (surface) => {
      let resolveStorage: ((value: {
        enabled: boolean;
        colorScheme: string;
      }) => void) | undefined;
      mocks.storageGet.mockImplementationOnce((_defaults, callback) => {
        resolveStorage = callback;
      });
      mocks.createAdapter.mockReturnValue(activeSurface(surface));

      const controller = startContentScript();

      const pendingStyle = document.getElementById('__universal_feed_hide_original__');
      expect(pendingStyle?.textContent).toContain('background: #fafafa');

      resolveStorage?.({ enabled: true, colorScheme: 'dark' });

      expect(pendingStyle?.textContent).toContain('background: #0a0a0a');
      expect(document.getElementById('__universal_feed_root__')?.dataset.onefeedTheme).toBe('dark');
      expect(document.getElementById('__universal_feed_root__')?.style.display).toBe('');
      controller.cleanup();
    },
  );

  it('waits for document.body while keeping the original page hidden', async () => {
    document.body.remove();
    const feed = activeSurface('feed');
    mocks.createAdapter.mockReturnValue(feed);

    const controller = startContentScript();

    expect(document.getElementById('__universal_feed_hide_original__')).not.toBeNull();
    expect(feed.adapter.init).not.toHaveBeenCalled();

    document.documentElement.appendChild(document.createElement('body'));
    await vi.waitFor(() => expect(feed.adapter.init).toHaveBeenCalledOnce());
    controller.cleanup();
  });

  it('initializes a feed adapter before the first surface render', () => {
    const feed = activeSurface('feed');
    mocks.createAdapter.mockReturnValue(feed);

    const controller = startContentScript();

    const initOrder = feed.adapter.init.mock.invocationCallOrder[0];
    const surfaceRenderOrder = mocks.render.mock.invocationCallOrder.at(-1);
    expect(initOrder).toBeLessThan(surfaceRenderOrder!);
    controller.cleanup();
  });

  it('brands the active tab and restores the latest original metadata when paused', async () => {
    const originalIcon = document.createElement('link');
    originalIcon.rel = 'icon';
    originalIcon.type = 'image/svg+xml';
    originalIcon.setAttribute('sizes', 'any');
    originalIcon.href = 'https://example.com/original.ico';
    document.head.appendChild(originalIcon);
    mocks.createAdapter.mockReturnValue(activeSurface('feed'));

    const controller = startContentScript();

    expect(document.title).toBe('OneFeed');
    expect(document.querySelector<HTMLLinkElement>('#__onefeed_tab_icon__')?.href)
      .toBe('chrome-extension://onefeed/icons/icon-32.png');
    expect(originalIcon.href).toBe('chrome-extension://onefeed/icons/icon-32.png');
    expect(originalIcon.type).toBe('image/png');
    expect(originalIcon.getAttribute('sizes')).toBe('32x32');

    document.title = '原站新标题';
    const routeIcon = document.createElement('link');
    routeIcon.rel = 'icon';
    routeIcon.type = 'image/svg+xml';
    routeIcon.setAttribute('sizes', 'any');
    routeIcon.href = 'https://example.com/new.ico';
    document.head.appendChild(routeIcon);

    await vi.waitFor(() => {
      expect(document.title).toBe('OneFeed');
      expect(Array.from(document.head.querySelectorAll('link[rel~="icon"]')).at(-1)?.id)
        .toBe('__onefeed_tab_icon__');
      expect(routeIcon.href).toBe('chrome-extension://onefeed/icons/icon-32.png');
    });

    const storageListener = mocks.storageAddListener.mock.calls[0]?.[0];
    storageListener?.({ enabled: { newValue: false } }, 'local');

    expect(document.title).toBe('原站新标题');
    expect(document.getElementById('__onefeed_tab_icon__')).toBeNull();
    expect(originalIcon.href).toBe('https://example.com/original.ico');
    expect(originalIcon.type).toBe('image/svg+xml');
    expect(originalIcon.getAttribute('sizes')).toBe('any');
    expect(routeIcon.href).toBe('https://example.com/new.ico');
    expect(routeIcon.type).toBe('image/svg+xml');
    expect(routeIcon.getAttribute('sizes')).toBe('any');
    expect(routeIcon.isConnected).toBe(true);
    controller.cleanup();
  });

  it('disconnects and replaces surfaces on SPA route changes', () => {
    const feed = activeSurface('feed');
    const detail = activeSurface('article');
    mocks.createAdapter.mockImplementation((url: URL) => {
      if (url.pathname === '/feed') return feed;
      if (url.pathname === '/detail') return detail;
      return null;
    });

    const controller = startContentScript();
    expect(feed.adapter.init).toHaveBeenCalledOnce();
    expect(document.title).toBe('OneFeed');
    const tabIcon = document.getElementById('__onefeed_tab_icon__');
    expect(document.getElementById('__universal_feed_hide_original__')).not.toBeNull();

    window.history.pushState({}, '', '/detail');
    controller.refresh();
    expect(feed.adapter.disconnect).toHaveBeenCalledOnce();
    expect(detail.adapter.init).toHaveBeenCalledOnce();
    expect(document.title).toBe('OneFeed');
    expect(document.getElementById('__onefeed_tab_icon__')).toBe(tabIcon);
    expect(document.getElementById('__universal_feed_root__')?.style.display).toBe('');
    expect(document.getElementById('__universal_feed_hide_original__')).not.toBeNull();

    window.history.pushState({}, '', '/unsupported');
    controller.refresh();
    expect(detail.adapter.disconnect).toHaveBeenCalledOnce();
    expect(document.getElementById('__universal_feed_root__')).toBeNull();
    expect(document.getElementById('__universal_feed_hide_original__')).toBeNull();
    expect(document.title).toBe('原站标题');
    expect(chrome.storage.local.set).not.toHaveBeenCalledWith({ enabled: false });

    controller.cleanup();
  });

  it('shows the dark detail loading surface during SPA navigation', () => {
    mocks.storageGet.mockImplementationOnce((_defaults, callback) => (
      callback({ enabled: true, colorScheme: 'dark' })
    ));
    const feed = activeSurface('feed');
    const detail = activeSurface('article');
    mocks.createAdapter.mockImplementation((url: URL) => (
      url.pathname === '/feed' ? feed : detail
    ));

    const controller = startContentScript();
    window.history.pushState({}, '', '/detail');
    controller.refresh();

    const pendingStyle = document.getElementById('__universal_feed_hide_original__');
    expect(pendingStyle?.textContent).toContain('background: #0a0a0a');
    expect(document.getElementById('__universal_feed_root__')?.style.display).toBe('');
    controller.cleanup();
  });

  it('renders detail content produced during adapter initialization', () => {
    window.history.replaceState({}, '', '/detail');
    const detail = activeSurface('article');
    mocks.createAdapter.mockImplementation((_url: URL, listeners) => {
      detail.adapter.init.mockImplementation(() => {
        listeners.onDetail({
          id: 'detail-1',
          platform: 'test',
          source: { id: 'test', name: '测试站点' },
          originalUrl: 'https://example.com/detail',
          kind: 'article',
          role: 'article',
          author: { name: '测试作者', avatar: '' },
          body: [],
        });
      });
      return detail;
    });

    const controller = startContentScript();

    expect(document.getElementById('__universal_feed_root__')?.style.display).toBe('');
    expect(document.getElementById('__universal_feed_hide_original__')).not.toBeNull();
    controller.cleanup();
  });

  it('reveals a thread surface after its header is parsed', () => {
    window.history.replaceState({}, '', '/thread');
    const thread = activeSurface('thread');
    mocks.createAdapter.mockImplementation((_url: URL, listeners) => {
      thread.adapter.init.mockImplementation(() => {
        listeners.onDetail({
          id: 'thread-1',
          platform: 'test',
          source: { id: 'test', name: '测试站点' },
          originalUrl: 'https://example.com/thread',
          kind: 'thread',
          header: {
            id: 'thread-1',
            role: 'topic',
            originalUrl: 'https://example.com/thread',
            title: '测试主题',
            body: [],
            metrics: [],
            actions: [],
          },
          entries: [],
          entryKind: 'reply',
          loadingMode: 'paged',
        });
      });
      return thread;
    });

    const controller = startContentScript();

    expect(document.getElementById('__universal_feed_root__')?.style.display).toBe('');
    expect(document.getElementById('__universal_feed_hide_original__')).not.toBeNull();
    controller.cleanup();
  });

  it('ignores hash-only navigation', () => {
    const feed = activeSurface('feed');
    mocks.createAdapter.mockReturnValue(feed);

    const controller = startContentScript();
    window.history.pushState({}, '', '/feed#comment-2');
    controller.refresh();

    expect(mocks.createAdapter).toHaveBeenCalledOnce();
    expect(feed.adapter.disconnect).not.toHaveBeenCalled();
    controller.cleanup();
  });
});
