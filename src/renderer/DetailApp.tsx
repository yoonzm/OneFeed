import { useEffect } from 'react';
import type { ColorScheme } from '../theme/useColorScheme';
import { i18n } from '../i18n';
import { useDisplayPreferences } from '../preferences/useDisplayPreferences';
import type { CommentCommand, CommentRequestResult } from '../types/comments';
import type { FeedActionDescriptor } from '../types/feed';
import { OneFeedShell } from './OneFeedShell';
import { useDetailStore } from './store/useDetailStore';
import { DetailArticle } from './themes/FocusPaper/DetailArticle';
import { ThreadDetail } from './themes/FocusPaper/ThreadDetail';

interface DetailAppProps {
  activePlatformId: string;
  surface: 'article' | 'thread';
  scrollElement: HTMLElement;
  initialColorScheme?: ColorScheme;
  onAction: (itemId: string, actionId: string) => boolean;
  onCommentRequest?: (command: CommentCommand) => Promise<CommentRequestResult>;
}

/** 根据 DetailContent.kind 在文章详情与讨论详情之间分流的 Surface 外壳。 */
export default function DetailApp({
  activePlatformId,
  surface,
  scrollElement,
  initialColorScheme,
  onAction,
  onCommentRequest,
}: DetailAppProps) {
  const content = useDetailStore((state) => state.content);
  const { preferences, ready: displayReady } = useDisplayPreferences();

  useEffect(() => {
    const handleScroll = () => {
      const available = scrollElement.scrollHeight - scrollElement.clientHeight;
      // 只有无限 Thread 需要借原页面触底加载；文章和分页 Thread 不应产生副作用。
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
    // 详情头与 Thread 条目拥有不同 URL，因此由调用方一并传入动作目标。
    if (!onAction(itemId, action.id) && action.fallback === 'openOriginal') {
      window.open(originalUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <OneFeedShell
      activePlatformId={activePlatformId}
      surface={surface}
      scrollElement={scrollElement}
      initialColorScheme={initialColorScheme}
    >
      <div className="reader-app detail-app">
        <main>
          {!displayReady ? (
            <section className="empty-state" aria-live="polite">
              <span className="scan-mark" aria-hidden="true" />
            </section>
          ) : content?.kind === 'article' ? (
            <DetailArticle
              content={content}
              hideImages={preferences.hideDetailImages}
              onAction={(action) => handleAction(content.id, content.originalUrl, action)}
              onCommentRequest={onCommentRequest}
            />
          ) : content?.kind === 'thread' ? (
            <ThreadDetail
              content={content}
              hideImages={preferences.hideDetailImages}
              onAction={handleAction}
            />
          ) : (
            <section className="empty-state" aria-live="polite">
              <span className="scan-mark" aria-hidden="true" />
            </section>
          )}
        </main>
        {content && displayReady && (
          <footer className="reader-footer">
            {content.kind === 'thread'
              ? i18n.t(content.entryKind === 'answer'
                ? 'reader.answersFinished'
                : 'reader.repliesFinished')
              : i18n.t(content.role === 'post'
                ? 'reader.postFinished'
                : 'reader.articleFinished')}
          </footer>
        )}
      </div>
    </OneFeedShell>
  );
}
