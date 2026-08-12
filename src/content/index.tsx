import { createRoot } from 'react-dom/client';
import DetailApp from '../renderer/DetailApp';
import FeedApp from '../renderer/FeedApp';
import readerStyles from '../renderer/styles.css?inline';
import { useDetailStore } from '../renderer/store/useDetailStore';
import { useFeedStore } from '../renderer/store/useFeedStore';
import { createAdapter } from './adapters/registry';
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

function mount(): (() => void) | undefined {
  if (document.getElementById(READER_HOST_ID)) return undefined;

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
  let hideOriginal: HTMLStyleElement | undefined;

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
    root.render(
      activeAdapter.surface === 'feed'
        ? <FeedApp {...sharedProps} />
        : <DetailApp {...sharedProps} />,
    );

    revealSurface = () => {
      host.style.removeProperty('display');
      if (hideOriginal) return;
      hideOriginal = document.createElement('style');
      hideOriginal.id = HIDE_STYLE_ID;
      hideOriginal.textContent = `
        body > *:not(#${READER_HOST_ID}):not(#${TOGGLE_HOST_ID}) {
          visibility: hidden !important;
          pointer-events: none !important;
        }
        html, body { scrollbar-width: none !important; }
        body::-webkit-scrollbar { display: none !important; }
      `;
      document.head.appendChild(hideOriginal);
    };
    if (activeAdapter.surface === 'feed') revealSurface();
    activeAdapter.adapter.init();

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
  let currentRouteKey = routeKey(new URL(window.location.href));
  let unmount: (() => void) | undefined;
  const toggleHost = document.createElement('div');
  toggleHost.id = TOGGLE_HOST_ID;
  document.body.appendChild(toggleHost);
  const toggleShadow = toggleHost.attachShadow({ mode: 'open' });
  const toggleStyle = document.createElement('style');
  toggleStyle.textContent = toggleStyles;
  toggleShadow.appendChild(toggleStyle);
  const toggleContainer = document.createElement('div');
  toggleShadow.appendChild(toggleContainer);
  const toggleRoot = createRoot(toggleContainer);

  const renderToggle = (ready: boolean) => {
    toggleRoot.render(
      <FloatingToggle
        enabled={enabled}
        ready={ready}
        onToggle={() => chrome.storage.local.set({ enabled: !enabled })}
      />,
    );
  };

  const applyEnabledState = () => {
    if (enabled && !unmount) {
      unmount = mount();
    } else if (!enabled && unmount) {
      unmount();
      unmount = undefined;
    }
  };

  const handleStorageChange = (
    changes: Record<string, chrome.storage.StorageChange>,
    areaName: string,
  ) => {
    if (areaName !== 'local' || !changes.enabled) return;
    enabled = changes.enabled.newValue !== false;
    renderToggle(true);
    applyEnabledState();
  };

  const refresh = () => {
    if (!active) return;
    const nextRouteKey = routeKey(new URL(window.location.href));
    if (nextRouteKey === currentRouteKey) return;
    currentRouteKey = nextRouteKey;
    unmount?.();
    unmount = enabled ? mount() : undefined;
  };

  renderToggle(false);
  chrome.storage.local.get({ enabled: true }, ({ enabled: storedEnabled }) => {
    if (!active) return;
    enabled = storedEnabled !== false;
    renderToggle(true);
    applyEnabledState();
  });
  chrome.storage.onChanged.addListener(handleStorageChange);

  return {
    refresh,
    cleanup: () => {
      active = false;
      chrome.storage.onChanged.removeListener(handleStorageChange);
      unmount?.();
      clearSurfaceStores();
      toggleRoot.unmount();
      toggleHost.remove();
    },
  };
}
