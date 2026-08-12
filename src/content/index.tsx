import { createRoot } from 'react-dom/client';
import DetailApp from '../renderer/DetailApp';
import FeedApp from '../renderer/FeedApp';
import readerStyles from '../renderer/styles.css?inline';
import { useDetailStore } from '../renderer/store/useDetailStore';
import { useFeedStore } from '../renderer/store/useFeedStore';
import { createAdapter, isSupportedUrl } from './adapters/registry';
import { FloatingToggle } from './FloatingToggle';
import toggleStyles from './floatingToggle.css?inline';

const READER_HOST_ID = '__universal_feed_root__';
const TOGGLE_HOST_ID = '__universal_feed_toggle__';
const HIDE_STYLE_ID = '__universal_feed_hide_original__';

function routeKey(url: URL): string {
  return `${url.origin}${url.pathname}${url.search}`;
}

function clearSurfaceStores(): void {
  useFeedStore.getState().clear();
  useDetailStore.getState().clear();
}

/** 在原站首屏绘制前建立纸张色遮罩；Surface 与开关节点挂载后仍保持可见。 */
function hideOriginalPage(url: URL): HTMLStyleElement | undefined {
  if (!isSupportedUrl(url)) return undefined;
  const existing = document.getElementById(HIDE_STYLE_ID);
  if (existing instanceof HTMLStyleElement) return existing;

  const container = document.head || document.documentElement;
  if (!container) return undefined;
  const style = document.createElement('style');
  style.id = HIDE_STYLE_ID;
  style.textContent = `
    html, body {
      background: #f7f8fa !important;
      scrollbar-width: none !important;
    }
    body > *:not(#${READER_HOST_ID}):not(#${TOGGLE_HOST_ID}) {
      visibility: hidden !important;
      pointer-events: none !important;
    }
    body::-webkit-scrollbar { display: none !important; }
  `;
  container.appendChild(style);
  return style;
}

/** document_start 时 body 尚未创建，通过短生命周期观察器尽早继续挂载。 */
function onBodyReady(callback: () => void): () => void {
  if (document.body) {
    callback();
    return () => undefined;
  }

  const handleReady = () => {
    if (!document.body) return;
    observer.disconnect();
    document.removeEventListener('DOMContentLoaded', handleReady);
    callback();
  };
  const observer = new MutationObserver(handleReady);
  observer.observe(document, { childList: true, subtree: true });
  document.addEventListener('DOMContentLoaded', handleReady);

  return () => {
    observer.disconnect();
    document.removeEventListener('DOMContentLoaded', handleReady);
  };
}

function mount(initialHideStyle?: HTMLStyleElement): (() => void) | undefined {
  if (!document.body || document.getElementById(READER_HOST_ID)) return undefined;

  let revealSurface = () => undefined;
  const activeAdapter = createAdapter(new URL(window.location.href), {
    onFeedItems: (items) => useFeedStore.getState().addFeedItems(items),
    onDetail: (content) => {
      useDetailStore.getState().setContent(content);
      revealSurface();
    },
  });
  if (!activeAdapter) return undefined;

  const host = document.createElement('div');
  host.id = READER_HOST_ID;
  if (activeAdapter.surface !== 'feed') host.style.display = 'none';
  document.body.appendChild(host);

  let root: ReturnType<typeof createRoot> | undefined;
  let hideOriginal = initialHideStyle;

  const cleanup = () => {
    activeAdapter.adapter.disconnect();
    root?.unmount();
    hideOriginal?.remove();
    host.remove();
    clearSurfaceStores();
  };

  try {
    clearSurfaceStores();
    const shadow = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = readerStyles;
    shadow.appendChild(style);
    const viewport = document.createElement('div');
    viewport.className = 'reader-viewport';
    shadow.appendChild(viewport);

    root = createRoot(viewport);
    const sharedProps = {
      scrollElement: viewport,
      onAction: (itemId: string, actionId: string) => (
        activeAdapter.adapter.triggerAction(itemId, actionId)
      ),
    };
    revealSurface = () => {
      host.style.removeProperty('display');
      if (!hideOriginal?.isConnected) {
        hideOriginal = hideOriginalPage(new URL(window.location.href));
      }
    };
    if (activeAdapter.surface === 'feed') revealSurface();
    // 已存在的卡片先进入 Store，让 React 首次绘制可以直接展示信息流。
    activeAdapter.adapter.init();
    root.render(
      activeAdapter.surface === 'feed'
        ? <FeedApp {...sharedProps} />
        : <DetailApp {...sharedProps} />,
    );

    return cleanup;
  } catch (error) {
    cleanup();
    chrome.storage.local.set({ enabled: false });
    console.error('OneFeed failed to start; restored the original page.', error);
    return undefined;
  }
}

export interface ContentScriptController {
  refresh: () => void;
  cleanup: () => void;
}

export function startContentScript(): ContentScriptController {
  let active = true;
  let enabled = false;
  let storageReady = false;
  let domReady = false;
  let currentRouteKey = routeKey(new URL(window.location.href));
  let unmount: (() => void) | undefined;
  let pendingHideStyle = hideOriginalPage(new URL(window.location.href));
  let toggleHost: HTMLDivElement | undefined;
  let toggleRoot: ReturnType<typeof createRoot> | undefined;

  const renderToggle = (ready: boolean) => {
    if (!toggleRoot) return;
    toggleRoot.render(
      <FloatingToggle
        enabled={enabled}
        ready={ready}
        onToggle={() => chrome.storage.local.set({ enabled: !enabled })}
      />,
    );
  };

  const applyEnabledState = () => {
    if (!storageReady) return;
    if (!enabled) {
      unmount?.();
      unmount = undefined;
      pendingHideStyle?.remove();
      pendingHideStyle = undefined;
      return;
    }
    if (!domReady) {
      pendingHideStyle ||= hideOriginalPage(new URL(window.location.href));
      return;
    }
    if (unmount) return;

    const hideStyle = pendingHideStyle || hideOriginalPage(new URL(window.location.href));
    pendingHideStyle = undefined;
    unmount = mount(hideStyle);
    if (!unmount) hideStyle?.remove();
  };

  const initializeDom = () => {
    if (!active || !document.body || domReady) return;
    domReady = true;
    toggleHost = document.createElement('div');
    toggleHost.id = TOGGLE_HOST_ID;
    document.body.appendChild(toggleHost);
    const toggleShadow = toggleHost.attachShadow({ mode: 'open' });
    const toggleStyle = document.createElement('style');
    toggleStyle.textContent = toggleStyles;
    toggleShadow.appendChild(toggleStyle);
    const toggleContainer = document.createElement('div');
    toggleShadow.appendChild(toggleContainer);
    toggleRoot = createRoot(toggleContainer);
    renderToggle(storageReady);
    applyEnabledState();
  };

  const stopWaitingForBody = onBodyReady(initializeDom);

  const handleStorageChange = (
    changes: Record<string, chrome.storage.StorageChange>,
    areaName: string,
  ) => {
    if (areaName !== 'local' || !changes.enabled) return;
    storageReady = true;
    enabled = changes.enabled.newValue !== false;
    renderToggle(true);
    applyEnabledState();
  };

  const refresh = () => {
    if (!active) return;
    const url = new URL(window.location.href);
    const nextRouteKey = routeKey(url);
    if (nextRouteKey === currentRouteKey) return;
    currentRouteKey = nextRouteKey;
    unmount?.();
    unmount = undefined;
    pendingHideStyle?.remove();
    pendingHideStyle = (!storageReady || enabled) ? hideOriginalPage(url) : undefined;
    applyEnabledState();
  };

  chrome.storage.local.get({ enabled: true }, ({ enabled: storedEnabled }) => {
    if (!active) return;
    storageReady = true;
    enabled = storedEnabled !== false;
    renderToggle(true);
    applyEnabledState();
  });
  chrome.storage.onChanged.addListener(handleStorageChange);

  return {
    refresh,
    cleanup: () => {
      active = false;
      stopWaitingForBody();
      chrome.storage.onChanged.removeListener(handleStorageChange);
      unmount?.();
      pendingHideStyle?.remove();
      clearSurfaceStores();
      toggleRoot?.unmount();
      toggleHost?.remove();
    },
  };
}
