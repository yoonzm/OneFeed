import { useEffect, useState } from 'react';
import type { FeedActionDescriptor, FeedItem, FeedSource } from '../types/feed';
import { useFeedStore } from './store/useFeedStore';
import { Card } from './themes/FocusPaper/Card';

interface FeedAppProps {
  scrollElement: HTMLElement;
  source: FeedSource;
  onAction: (itemId: string, actionId: string) => boolean;
}

export default function FeedApp({
  scrollElement,
  source,
  onAction,
}: FeedAppProps) {
  const items = useFeedStore((state) => state.items);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const available = scrollElement.scrollHeight - scrollElement.clientHeight;
      const nextProgress = available > 0 ? scrollElement.scrollTop / available : 0;
      setProgress(Math.min(1, Math.max(0, nextProgress)));

      if (available - scrollElement.scrollTop < 800) {
        window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
      }
    };
    scrollElement.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollElement.removeEventListener('scroll', handleScroll);
  }, [scrollElement]);

  const handleAction = (item: FeedItem, action: FeedActionDescriptor) => {
    if (!onAction(item.id, action.id) && action.fallback === 'openOriginal') {
      window.open(item.originalUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
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
            <p>正在整理{source.name}信息流</p>
            <small>页面内容出现后，会自动转换为专注阅读模式。</small>
          </section>
        )}
      </main>
      <footer className="reader-footer">已读到这里 · 继续滚动会加载原信息流</footer>
    </div>
  );
}
