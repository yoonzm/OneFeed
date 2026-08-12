import { useEffect, useState } from 'react';
import type { ColorScheme } from '../theme/useColorScheme';
import type { FeedActionDescriptor, FeedItem } from '../types/feed';
import { OneFeedShell } from './OneFeedShell';
import { useFeedStore } from './store/useFeedStore';
import { Card } from './themes/FocusPaper/Card';

interface FeedAppProps {
  activePlatformId: string;
  scrollElement: HTMLElement;
  initialColorScheme?: ColorScheme;
  onAction: (itemId: string, actionId: string) => boolean;
}

/** Feed Surface 外壳：连接状态库、阅读进度和原页面的无限加载。 */
export default function FeedApp({
  activePlatformId,
  scrollElement,
  initialColorScheme,
  onAction,
}: FeedAppProps) {
  const items = useFeedStore((state) => state.items);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const available = scrollElement.scrollHeight - scrollElement.clientHeight;
      const nextProgress = available > 0 ? scrollElement.scrollTop / available : 0;
      setProgress(Math.min(1, Math.max(0, nextProgress)));

      // 新视图在 Shadow DOM 内滚动；接近底部时同步驱动被隐藏的原页面继续加载。
      if (available - scrollElement.scrollTop < 800) {
        window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
      }
    };
    scrollElement.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollElement.removeEventListener('scroll', handleScroll);
  }, [scrollElement]);

  const handleAction = (item: FeedItem, action: FeedActionDescriptor) => {
    // Adapter 返回 false 表示无法代理原站操作；仅显式声明回退的动作才打开原文。
    if (!onAction(item.id, action.id) && action.fallback === 'openOriginal') {
      window.open(item.originalUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <OneFeedShell
      activePlatformId={activePlatformId}
      surface="feed"
      scrollElement={scrollElement}
      initialColorScheme={initialColorScheme}
    >
      <div className="reader-app">
        <div className="reading-rail" aria-hidden="true">
          <span className="rail-label">READ</span>
          <span className="rail-track"><i style={{ height: `${progress * 100}%` }} /></span>
          <span className="rail-percent">{Math.round(progress * 100)}%</span>
        </div>

        <main>
          {items.length ? (
            items.map((item, index) => (
              <Card
                key={item.id}
                item={item}
                index={index}
                onAction={handleAction}
              />
            ))
          ) : (
            <section className="empty-state" aria-live="polite">
              <span className="scan-mark" aria-hidden="true" />
            </section>
          )}
        </main>
        {!!items.length && (
          <footer className="reader-footer">已读到这里 · 继续滚动会加载原信息流</footer>
        )}
      </div>
    </OneFeedShell>
  );
}
