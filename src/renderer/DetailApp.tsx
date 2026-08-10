import { useEffect, useState } from 'react';
import type { FeedActionDescriptor, FeedSource } from '../types/feed';
import { useDetailStore } from './store/useDetailStore';
import { DetailArticle } from './themes/FocusPaper/DetailArticle';
import { Header } from './themes/FocusPaper/Header';

interface DetailAppProps {
  scrollElement: HTMLElement;
  source: FeedSource;
  onDisable: () => void;
  onAction: (itemId: string, actionId: string) => boolean;
}

export default function DetailApp({
  scrollElement,
  source,
  onDisable,
  onAction,
}: DetailAppProps) {
  const content = useDetailStore((state) => state.content);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const available = scrollElement.scrollHeight - scrollElement.clientHeight;
      const nextProgress = available > 0 ? scrollElement.scrollTop / available : 0;
      setProgress(Math.min(1, Math.max(0, nextProgress)));
    };
    scrollElement.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollElement.removeEventListener('scroll', handleScroll);
  }, [scrollElement]);

  const handleAction = (action: FeedActionDescriptor) => {
    if (!content) return;
    if (!onAction(content.id, action.id) && action.fallback === 'openOriginal') {
      window.open(content.originalUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="reader-app detail-app">
      <div className="reading-rail" aria-hidden="true">
        <span className="rail-label">READ</span>
        <span className="rail-track"><i style={{ height: `${progress * 100}%` }} /></span>
        <span className="rail-percent">{Math.round(progress * 100)}%</span>
      </div>

      <Header source={source} status="文章详情" onDisable={onDisable} />
      <main>
        {content ? (
          <DetailArticle content={content} onAction={handleAction} />
        ) : (
          <section className="empty-state" aria-live="polite">
            <span className="scan-mark" aria-hidden="true" />
            <p>正在整理{source.name}详情</p>
            <small>正文出现后，会自动转换为专注阅读模式。</small>
          </section>
        )}
      </main>
      <footer className="reader-footer">已读完本文</footer>
    </div>
  );
}
