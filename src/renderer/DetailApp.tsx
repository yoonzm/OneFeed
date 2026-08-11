import { useEffect, useState } from 'react';
import type { FeedActionDescriptor, FeedSource } from '../types/feed';
import { useDetailStore } from './store/useDetailStore';
import { DetailArticle } from './themes/FocusPaper/DetailArticle';
import { ThreadDetail } from './themes/FocusPaper/ThreadDetail';

interface DetailAppProps {
  scrollElement: HTMLElement;
  source: FeedSource;
  onAction: (itemId: string, actionId: string) => boolean;
}

export default function DetailApp({
  scrollElement,
  source,
  onAction,
}: DetailAppProps) {
  const content = useDetailStore((state) => state.content);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const available = scrollElement.scrollHeight - scrollElement.clientHeight;
      const nextProgress = available > 0 ? scrollElement.scrollTop / available : 0;
      setProgress(Math.min(1, Math.max(0, nextProgress)));

      if (
        content?.kind === 'thread' &&
        content.loadingMode === 'infinite' &&
        available - scrollElement.scrollTop < 800
      ) {
        window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
      }
    };
    scrollElement.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollElement.removeEventListener('scroll', handleScroll);
  }, [content, scrollElement]);

  const handleAction = (
    itemId: string,
    originalUrl: string,
    action: FeedActionDescriptor,
  ) => {
    if (!onAction(itemId, action.id) && action.fallback === 'openOriginal') {
      window.open(originalUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="reader-app detail-app">
      <div className="reading-rail" aria-hidden="true">
        <span className="rail-label">READ</span>
        <span className="rail-track"><i style={{ height: `${progress * 100}%` }} /></span>
        <span className="rail-percent">{Math.round(progress * 100)}%</span>
      </div>

      <main>
        {content?.kind === 'article' ? (
          <DetailArticle
            content={content}
            onAction={(action) => handleAction(content.id, content.originalUrl, action)}
          />
        ) : content?.kind === 'thread' ? (
          <ThreadDetail content={content} onAction={handleAction} />
        ) : (
          <section className="empty-state" aria-live="polite">
            <span className="scan-mark" aria-hidden="true" />
            <p>正在整理{source.name}详情</p>
            <small>正文出现后，会自动转换为专注阅读模式。</small>
          </section>
        )}
      </main>
      <footer className="reader-footer">
        {content?.kind === 'thread' ? `已读完本页${content.entryLabel}` : '已读完本文'}
      </footer>
    </div>
  );
}
