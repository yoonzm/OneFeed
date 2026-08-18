import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { filterFeedItems } from '../filters/feedFilters';
import { useFeedFilters } from '../filters/useFeedFilters';
import type { ColorScheme } from '../theme/useColorScheme';
import type {
  FeedActionDescriptor,
  FeedChannel,
  FeedItem,
  FeedLoadResult,
} from '../types/feed';
import { OneFeedShell } from './OneFeedShell';
import { useFeedStore } from './store/useFeedStore';
import { Card } from './themes/FocusPaper/Card';
import { getSeenFeedItemKey, useSeenFeedItems } from './useSeenFeedItems';

interface FeedAppProps {
  activePlatformId: string;
  channels?: readonly FeedChannel[];
  onFeedChannelSelect?: (channelId: string) => boolean;
  scrollElement: HTMLElement;
  initialColorScheme?: ColorScheme;
  onAction: (itemId: string, actionId: string) => boolean;
  onLoadMore: () => Promise<FeedLoadResult>;
}

type FeedLoadState =
  | { phase: 'idle' | 'loading' | 'exhausted' }
  | { phase: 'failed'; retryable: boolean };

/** Feed Surface 外壳：连接状态库、阅读进度和原页面的无限加载。 */
export default function FeedApp({
  activePlatformId,
  channels,
  onFeedChannelSelect,
  scrollElement,
  initialColorScheme,
  onAction,
  onLoadMore,
}: FeedAppProps) {
  const items = useFeedStore((state) => state.items);
  const hasItems = items.length > 0;
  const [progress, setProgress] = useState(0);
  const [loadState, setLoadState] = useState<FeedLoadState>({ phase: 'idle' });
  const loadSentinelRef = useRef<HTMLSpanElement>(null);
  const loadInFlightRef = useRef(false);
  const autoLoadBlockedRef = useRef(false);
  const exhaustedRef = useRef(false);
  const mountedRef = useRef(true);
  const { markSeen, seenItemKeys } = useSeenFeedItems();
  const { settings: filterSettings, ready: filtersReady } = useFeedFilters();
  const filterResult = useMemo(() => filterFeedItems(items, filterSettings, {
    isSeen: (item) => seenItemKeys.has(getSeenFeedItemKey(item)),
  }), [filterSettings, items, seenItemKeys]);
  const visibleItems = filterResult.visibleItems;
  const hasVisibleItems = filtersReady && visibleItems.length > 0;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const available = scrollElement.scrollHeight - scrollElement.clientHeight;
      const nextProgress = available > 0 ? scrollElement.scrollTop / available : 0;
      setProgress(Math.min(1, Math.max(0, nextProgress)));
    };
    scrollElement.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollElement.removeEventListener('scroll', handleScroll);
  }, [scrollElement]);

  const requestMore = useCallback(async (manualRetry = false) => {
    if (
      loadInFlightRef.current ||
      exhaustedRef.current ||
      (autoLoadBlockedRef.current && !manualRetry)
    ) return;

    loadInFlightRef.current = true;
    autoLoadBlockedRef.current = false;
    setLoadState({ phase: 'loading' });
    try {
      const result = await onLoadMore();
      if (!mountedRef.current) return;

      if (result.kind === 'loaded') {
        exhaustedRef.current = !result.hasMore;
        setLoadState({ phase: result.hasMore ? 'idle' : 'exhausted' });
      } else if (result.kind === 'exhausted') {
        exhaustedRef.current = true;
        setLoadState({ phase: 'exhausted' });
      } else {
        autoLoadBlockedRef.current = true;
        setLoadState({ phase: 'failed', retryable: result.retryable });
      }
    } catch {
      if (!mountedRef.current) return;
      autoLoadBlockedRef.current = true;
      setLoadState({ phase: 'failed', retryable: true });
    } finally {
      loadInFlightRef.current = false;
    }
  }, [onLoadMore]);

  useEffect(() => {
    const sentinel = loadSentinelRef.current;
    if (!filtersReady || !hasVisibleItems || !sentinel) return undefined;

    if (typeof IntersectionObserver === 'undefined') {
      const handleLoadScroll = () => {
        const remaining = scrollElement.scrollHeight -
          scrollElement.clientHeight -
          scrollElement.scrollTop;
        if (remaining < 800) void requestMore();
      };
      scrollElement.addEventListener('scroll', handleLoadScroll, { passive: true });
      handleLoadScroll();
      return () => scrollElement.removeEventListener('scroll', handleLoadScroll);
    }

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) void requestMore();
    }, {
      root: scrollElement,
      rootMargin: '800px 0px',
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [filtersReady, hasVisibleItems, requestMore, scrollElement]);

  const handleAction = (item: FeedItem, action: FeedActionDescriptor) => {
    // Adapter 返回 false 表示无法代理原站操作；仅显式声明回退的动作才打开原文。
    if (!onAction(item.id, action.id) && action.fallback === 'openOriginal') {
      window.open(item.originalUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <OneFeedShell
      activePlatformId={activePlatformId}
      channels={channels}
      onFeedChannelSelect={onFeedChannelSelect}
      surface="feed"
      scrollElement={scrollElement}
      initialColorScheme={initialColorScheme}
      hiddenItemCount={filtersReady ? filterResult.hiddenItems.length : 0}
    >
      <div className="reader-app">
        <div className="reading-rail" aria-hidden="true">
          <span className="rail-label">READ</span>
          <span className="rail-track"><i style={{ height: `${progress * 100}%` }} /></span>
          <span className="rail-percent">{Math.round(progress * 100)}%</span>
        </div>

        <main>
          {!hasItems || !filtersReady ? (
            <section className="empty-state" aria-live="polite">
              <span className="scan-mark" aria-hidden="true" />
            </section>
          ) : (
            visibleItems.map((item, index) => {
              const seenItemKey = getSeenFeedItemKey(item);
              return (
                <Card
                  key={item.id}
                  item={item}
                  index={index}
                  isSeen={seenItemKeys.has(seenItemKey)}
                  onSeen={() => markSeen(seenItemKey)}
                  onAction={handleAction}
                />
              );
            })
          )}
        </main>
        {hasVisibleItems && (
          <footer className="reader-footer" aria-live="polite">
            {loadState.phase === 'loading' && '正在加载更多内容…'}
            {loadState.phase === 'idle' && '已读到这里 · 继续滚动加载更多'}
            {loadState.phase === 'exhausted' && '已加载全部内容'}
            {loadState.phase === 'failed' && (
              loadState.retryable
                ? (
                    <button type="button" onClick={() => void requestMore(true)}>
                      加载失败 · 点击重试
                    </button>
                  )
                : '无法继续加载'
            )}
            <span ref={loadSentinelRef} className="feed-load-sentinel" aria-hidden="true" />
          </footer>
        )}
      </div>
    </OneFeedShell>
  );
}
