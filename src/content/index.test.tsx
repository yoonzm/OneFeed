import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createAdapter: vi.fn(),
  isSupportedUrl: vi.fn(),
  render: vi.fn(),
  storageGet: vi.fn(),
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
    },
  };
}

describe('content surface lifecycle', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/feed');
    mocks.createAdapter.mockReset();
    mocks.isSupportedUrl.mockReset().mockReturnValue(true);
    mocks.render.mockReset();
    mocks.storageGet.mockReset().mockImplementation((_defaults, callback) => (
      callback({ enabled: true })
    ));
    mocks.unmountRoot.mockReset();
    vi.stubGlobal('chrome', {
      storage: {
        local: {
          get: mocks.storageGet,
          set: vi.fn(),
        },
        onChanged: {
          addListener: vi.fn(),
          removeListener: vi.fn(),
        },
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.getElementById('__universal_feed_hide_original__')?.remove();
    document.getElementById('__universal_feed_root__')?.remove();
    document.getElementById('__universal_feed_toggle__')?.remove();
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
    expect(mocks.createAdapter).not.toHaveBeenCalled();

    resolveStorage?.({ enabled: false });
    expect(document.getElementById('__universal_feed_hide_original__')).toBeNull();
    expect(mocks.createAdapter).not.toHaveBeenCalled();
    controller.cleanup();
  });

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
    expect(document.getElementById('__universal_feed_hide_original__')).not.toBeNull();

    window.history.pushState({}, '', '/detail');
    controller.refresh();
    expect(feed.adapter.disconnect).toHaveBeenCalledOnce();
    expect(detail.adapter.init).toHaveBeenCalledOnce();
    expect(document.getElementById('__universal_feed_root__')?.style.display).toBe('none');
    expect(document.getElementById('__universal_feed_hide_original__')).not.toBeNull();

    window.history.pushState({}, '', '/unsupported');
    controller.refresh();
    expect(detail.adapter.disconnect).toHaveBeenCalledOnce();
    expect(document.getElementById('__universal_feed_root__')).toBeNull();
    expect(document.getElementById('__universal_feed_hide_original__')).toBeNull();
    expect(chrome.storage.local.set).not.toHaveBeenCalledWith({ enabled: false });

    controller.cleanup();
  });

  it('reveals a detail surface only after the adapter produces content', () => {
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
          metrics: [],
          actions: [],
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
          entryLabel: '回复',
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
