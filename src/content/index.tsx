import { createRoot } from 'react-dom/client';
import App from '../renderer/App';
import readerStyles from '../renderer/styles.css?inline';
import { useFeedStore } from '../renderer/store/useFeedStore';
import type { BaseAdapter } from './adapters/base';
import { createAdapter } from './adapters/registry';
import { FloatingToggle } from './FloatingToggle';
import toggleStyles from './floatingToggle.css?inline';

const READER_HOST_ID = '__universal_feed_root__';
const TOGGLE_HOST_ID = '__universal_feed_toggle__';
const HIDE_STYLE_ID = '__universal_feed_hide_original__';

function mount(): () => void {
  if (document.getElementById(READER_HOST_ID)) return () => undefined;

  const host = document.createElement('div');
  host.id = READER_HOST_ID;
  document.body.appendChild(host);

  let adapter: BaseAdapter | undefined;
  let root: ReturnType<typeof createRoot> | undefined;
  let hideOriginal: HTMLStyleElement | undefined;

  const cleanup = () => {
    adapter?.disconnect();
    root?.unmount();
    hideOriginal?.remove();
    host.remove();
    useFeedStore.getState().clear();
  };

  try {
    const shadow = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = readerStyles;
    shadow.appendChild(style);
    const viewport = document.createElement('div');
    viewport.className = 'reader-viewport';
    shadow.appendChild(viewport);

    const activeAdapter = createAdapter(window.location.hostname, (items) => {
      useFeedStore.getState().addFeedItems(items);
    });
    if (!activeAdapter) throw new Error(`Unsupported host: ${window.location.hostname}`);
    adapter = activeAdapter.adapter;
    adapter.init();

    root = createRoot(viewport);
    root.render(
      <App
        scrollElement={viewport}
        source={activeAdapter.source}
        onDisable={() => chrome.storage.local.set({ enabled: false })}
        onAction={(itemId, actionId) => adapter?.triggerAction(itemId, actionId) || false}
      />,
    );

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

    return cleanup;
  } catch (error) {
    cleanup();
    chrome.storage.local.set({ enabled: false });
    console.error('OneFeed failed to start; restored the original page.', error);
    return () => undefined;
  }
}

export function startContentScript(): () => void {
  let active = true;
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

  const renderToggle = (enabled: boolean, ready: boolean) => {
    toggleRoot.render(
      <FloatingToggle
        enabled={enabled}
        ready={ready}
        onToggle={() => chrome.storage.local.set({ enabled: !enabled })}
      />,
    );
  };

  const handleStorageChange = (
    changes: Record<string, chrome.storage.StorageChange>,
    areaName: string,
  ) => {
    if (areaName !== 'local' || !changes.enabled) return;
    const enabled = changes.enabled.newValue !== false;
    renderToggle(enabled, true);
    if (enabled && !unmount) {
      unmount = mount();
    } else if (!enabled && unmount) {
      unmount();
      unmount = undefined;
    }
  };

  renderToggle(false, false);
  chrome.storage.local.get({ enabled: true }, ({ enabled }) => {
    if (!active) return;
    const isEnabled = enabled !== false;
    renderToggle(isEnabled, true);
    if (isEnabled) unmount = mount();
  });
  chrome.storage.onChanged.addListener(handleStorageChange);

  return () => {
    active = false;
    chrome.storage.onChanged.removeListener(handleStorageChange);
    unmount?.();
    toggleRoot.unmount();
    toggleHost.remove();
  };
}
