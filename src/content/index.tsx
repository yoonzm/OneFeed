import { createRoot } from 'react-dom/client';
import DetailApp from '../renderer/DetailApp';
import FeedApp from '../renderer/FeedApp';
import readerStyles from '../renderer/styles.css?inline';
import { useDetailStore } from '../renderer/store/useDetailStore';
import { useFeedStore } from '../renderer/store/useFeedStore';
import {
  DEFAULT_COLOR_SCHEME,
  normalizeColorScheme,
  type ColorScheme,
} from '../theme/useColorScheme';
import { uiLocale } from '../i18n';
import type { FeedChannel } from '../types/feed';
import { createAdapter, isSupportedUrl } from './adapters/registry';
import { FloatingToggle } from './FloatingToggle';
import toggleStyles from './floatingToggle.css?inline';

const READER_HOST_ID = '__universal_feed_root__';
const TOGGLE_HOST_ID = '__universal_feed_toggle__';
const HIDE_STYLE_ID = '__universal_feed_hide_original__';
const TAB_ICON_ID = '__onefeed_tab_icon__';
const TAB_TITLE = 'OneFeed';
const PAGE_BACKGROUND_BY_COLOR_SCHEME: Record<ColorScheme, string> = {
  light: '#f7f8fa',
  dark: '#101722',
};

function routeKey(url: URL): string {
  return `${url.origin}${url.pathname}${url.search}`;
}

function clearSurfaceStores(): void {
  useFeedStore.getState().clear();
  useDetailStore.getState().clear();
}

/** 保留原站元数据，并在 SPA 异步更新 head 后继续维持 OneFeed 标签品牌。 */
function takeOverTabBranding(): () => void {
  let originalTitle = document.title;
  const iconUrl = chrome.runtime.getURL('icons/icon-32.png');
  const originalIcons = new Map<HTMLLinkElement, {
    href: string | null;
    sizes: string | null;
    type: string | null;
  }>();
  let observedTarget: Node | undefined;

  const brandIcon = (icon: HTMLLinkElement) => {
    const stored = originalIcons.get(icon);
    if (stored) {
      // 原站可能在接管期间复用同一节点；先记住它的新值，再重新应用品牌。
      if (icon.href !== iconUrl) stored.href = icon.getAttribute('href');
      if (icon.type !== 'image/png') stored.type = icon.getAttribute('type');
      if (icon.getAttribute('sizes') !== '32x32') {
        stored.sizes = icon.getAttribute('sizes');
      }
    } else {
      originalIcons.set(icon, {
        href: icon.getAttribute('href'),
        sizes: icon.getAttribute('sizes'),
        type: icon.getAttribute('type'),
      });
    }

    if (icon.href !== iconUrl) icon.href = iconUrl;
    if (icon.type !== 'image/png') icon.type = 'image/png';
    if (icon.getAttribute('sizes') !== '32x32') icon.setAttribute('sizes', '32x32');
  };

  const observer = new MutationObserver(() => applyBranding());
  const observeBrandingTarget = () => {
    const target = document.head || document.documentElement;
    if (!target || target === observedTarget) return;
    observer.disconnect();
    observer.observe(target, {
      attributes: true,
      attributeFilter: ['href', 'rel', 'sizes', 'type'],
      characterData: true,
      childList: true,
      subtree: true,
    });
    observedTarget = target;
  };
  const applyBranding = () => {
    if (document.title !== TAB_TITLE) {
      originalTitle = document.title;
      document.title = TAB_TITLE;
    }

    const head = document.head;
    if (!head) {
      observeBrandingTarget();
      return;
    }
    const existing = document.getElementById(TAB_ICON_ID);
    const icon = existing instanceof HTMLLinkElement
      ? existing
      : document.createElement('link');
    if (!(existing instanceof HTMLLinkElement)) {
      existing?.remove();
      icon.id = TAB_ICON_ID;
    }
    if (icon.rel !== 'icon') icon.rel = 'icon';
    if (icon.type !== 'image/png') icon.type = 'image/png';
    if (icon.getAttribute('sizes') !== '32x32') icon.setAttribute('sizes', '32x32');
    if (icon.href !== iconUrl) icon.href = iconUrl;

    const faviconLinks = Array.from(
      head.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]'),
    );
    faviconLinks.forEach((candidate) => {
      if (candidate !== icon) brandIcon(candidate);
    });
    if (faviconLinks.at(-1) !== icon) head.appendChild(icon);
    // 丢弃本轮自身写入产生的记录，避免观察器反复触发。
    observer.takeRecords();
    observeBrandingTarget();
  };

  applyBranding();
  observeBrandingTarget();

  return () => {
    observer.disconnect();
    document.getElementById(TAB_ICON_ID)?.remove();
    originalIcons.forEach((attributes, icon) => {
      if (!icon.isConnected) return;
      (['href', 'sizes', 'type'] as const).forEach((name) => {
        const value = attributes[name];
        if (value === null) icon.removeAttribute(name);
        else icon.setAttribute(name, value);
      });
    });
    document.title = originalTitle;
  };
}

/** 在原站首屏绘制前建立纸张色遮罩；详情解析期间同步主题，避免等待画面闪烁。 */
function updateHiddenPageTheme(
  style: HTMLStyleElement,
  colorScheme: ColorScheme,
): void {
  style.textContent = `
    html, body {
      background: ${PAGE_BACKGROUND_BY_COLOR_SCHEME[colorScheme]} !important;
      scrollbar-width: none !important;
    }
    body > *:not(#${READER_HOST_ID}):not(#${TOGGLE_HOST_ID}) {
      visibility: hidden !important;
      pointer-events: none !important;
    }
    body::-webkit-scrollbar { display: none !important; }
  `;
}

function hideOriginalPage(
  url: URL,
  colorScheme: ColorScheme = DEFAULT_COLOR_SCHEME,
): HTMLStyleElement | undefined {
  if (!isSupportedUrl(url)) return undefined;
  const existing = document.getElementById(HIDE_STYLE_ID);
  if (existing instanceof HTMLStyleElement) {
    updateHiddenPageTheme(existing, colorScheme);
    return existing;
  }

  const container = document.head || document.documentElement;
  if (!container) return undefined;
  const style = document.createElement('style');
  style.id = HIDE_STYLE_ID;
  updateHiddenPageTheme(style, colorScheme);
  container.appendChild(style);
  return style;
}

function updateActiveHiddenPageTheme(colorScheme: ColorScheme): void {
  const style = document.getElementById(HIDE_STYLE_ID);
  if (style instanceof HTMLStyleElement) updateHiddenPageTheme(style, colorScheme);
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

function mount(
  initialHideStyle?: HTMLStyleElement,
  initialColorScheme: ColorScheme = DEFAULT_COLOR_SCHEME,
): (() => void) | undefined {
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
  host.lang = uiLocale;
  host.dataset.onefeedTheme = initialColorScheme;
  // DetailApp 自带加载态；适配器等待原站正文时保持宿主可见，避免只显示空白遮罩。
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
      initialColorScheme,
      onAction: (itemId: string, actionId: string) => (
        activeAdapter.adapter.triggerAction(itemId, actionId)
      ),
    };
    revealSurface = () => {
      host.style.removeProperty('display');
      if (!hideOriginal?.isConnected) {
        hideOriginal = hideOriginalPage(
          new URL(window.location.href),
          normalizeColorScheme(host.dataset.onefeedTheme),
        );
      }
    };
    if (activeAdapter.surface === 'feed') {
      revealSurface();
      let channels: FeedChannel[] = [];
      let initialized = false;
      let channelRevision = 0;
      const renderFeed = () => {
        const initialSearchQuery = activeAdapter.adapter.getInitialSearchQuery();
        root?.render(
          <FeedApp
            key={`feed-channel-${channelRevision}`}
            {...sharedProps}
            activePlatformId={activeAdapter.source.id}
            channels={channels}
            initialSearchQuery={initialSearchQuery}
            onFeedChannelSelect={(channelId) => {
              const handled = activeAdapter.adapter.triggerFeedChannel(channelId);
              if (handled) {
                useFeedStore.getState().clear();
                channelRevision += 1;
                renderFeed();
              }
              return handled;
            }}
            onSearch={initialSearchQuery === undefined
              ? undefined
              : (query) => activeAdapter.adapter.triggerSearch(query)}
            onLoadMore={() => activeAdapter.adapter.requestMore()}
          />,
        );
      };
      activeAdapter.adapter.setFeedChannelsListener((nextChannels) => {
        channels = nextChannels;
        if (initialized) renderFeed();
      });
      // 已存在的卡片和原站频道先进入状态，让 React 首次绘制可以直接展示。
      activeAdapter.adapter.init();
      initialized = true;
      renderFeed();
    } else {
      activeAdapter.adapter.init();
      root.render(
        <DetailApp
          {...sharedProps}
          activePlatformId={activeAdapter.source.id}
          surface={activeAdapter.surface}
          onCommentRequest={(command) => (
            activeAdapter.adapter.requestComments?.(command) ||
            Promise.resolve({ kind: 'failed' as const, retryable: false })
          )}
        />,
      );
    }

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
  const initialUrl = new URL(window.location.href);
  let active = true;
  let enabled = false;
  let colorScheme = DEFAULT_COLOR_SCHEME;
  let storageReady = false;
  let domReady = false;
  let currentRouteKey = routeKey(initialUrl);
  let unmount: (() => void) | undefined;
  // 存储读取前先乐观接管，避免原站 favicon 在首帧短暂显示；禁用状态返回后会恢复。
  let restoreTabBranding = isSupportedUrl(initialUrl)
    ? takeOverTabBranding()
    : undefined;
  let pendingHideStyle = hideOriginalPage(initialUrl);
  let toggleHost: HTMLDivElement | undefined;
  let toggleRoot: ReturnType<typeof createRoot> | undefined;

  const restoreOriginalTab = () => {
    restoreTabBranding?.();
    restoreTabBranding = undefined;
  };

  const renderToggle = (ready: boolean) => {
    if (!toggleRoot) return;
    toggleRoot.render(
      <FloatingToggle
        enabled={enabled}
        ready={ready}
        iconUrl={chrome.runtime.getURL('icons/icon-32.png')}
        colorScheme={colorScheme}
        onToggle={() => chrome.storage.local.set({ enabled: !enabled })}
      />,
    );
  };

  const applyEnabledState = () => {
    const url = new URL(window.location.href);
    const shouldTakeOver = isSupportedUrl(url) && (!storageReady || enabled);
    if (shouldTakeOver) {
      restoreTabBranding ??= takeOverTabBranding();
    } else {
      restoreOriginalTab();
    }
    if (!storageReady) return;
    if (!enabled) {
      unmount?.();
      unmount = undefined;
      pendingHideStyle?.remove();
      pendingHideStyle = undefined;
      return;
    }
    if (!domReady) {
      pendingHideStyle = hideOriginalPage(url, colorScheme);
      return;
    }
    if (unmount) return;

    const hideStyle = hideOriginalPage(url, colorScheme);
    pendingHideStyle = undefined;
    unmount = mount(hideStyle, colorScheme);
    if (!unmount) {
      hideStyle?.remove();
      restoreOriginalTab();
    }
  };

  const initializeDom = () => {
    if (!active || !document.body || domReady) return;
    domReady = true;
    toggleHost = document.createElement('div');
    toggleHost.id = TOGGLE_HOST_ID;
    toggleHost.lang = uiLocale;
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
    if (areaName !== 'local') return;
    if (changes.colorScheme) {
      colorScheme = normalizeColorScheme(changes.colorScheme.newValue);
      updateActiveHiddenPageTheme(colorScheme);
      const readerHost = document.getElementById(READER_HOST_ID);
      if (readerHost instanceof HTMLDivElement) {
        readerHost.dataset.onefeedTheme = colorScheme;
      }
      renderToggle(storageReady);
    }
    if (changes.enabled) {
      storageReady = true;
      enabled = changes.enabled.newValue !== false;
      renderToggle(true);
      applyEnabledState();
    }
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
    pendingHideStyle = (!storageReady || enabled)
      ? hideOriginalPage(url, colorScheme)
      : undefined;
    applyEnabledState();
  };

  chrome.storage.local.get(
    { enabled: true, colorScheme: DEFAULT_COLOR_SCHEME },
    ({ enabled: storedEnabled, colorScheme: storedColorScheme }) => {
      if (!active) return;
      storageReady = true;
      enabled = storedEnabled !== false;
      colorScheme = normalizeColorScheme(storedColorScheme);
      updateActiveHiddenPageTheme(colorScheme);
      renderToggle(true);
      applyEnabledState();
    },
  );
  chrome.storage.onChanged.addListener(handleStorageChange);

  return {
    refresh,
    cleanup: () => {
      active = false;
      stopWaitingForBody();
      chrome.storage.onChanged.removeListener(handleStorageChange);
      unmount?.();
      pendingHideStyle?.remove();
      restoreOriginalTab();
      clearSurfaceStores();
      toggleRoot?.unmount();
      toggleHost?.remove();
    },
  };
}
