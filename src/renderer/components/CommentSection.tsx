import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import type {
  CommentCommand,
  CommentItem,
  CommentRequestResult,
  CommentSnapshot,
  CommentThreadDescriptor,
} from '../../types/comments';
import type { FeedImage } from '../../types/feed';
import { formatDateTime, formatNumber, i18n } from '../../i18n';
import { BlockRenderer } from './BlockRenderer';

type CommentRequest = (command: CommentCommand) => Promise<CommentRequestResult>;
type CommentStatus = 'idle' | 'loading' | 'ready' | 'failed';
const metricLabels = {
  reactions: i18n.t('metric.reactions'),
  replies: i18n.t('metric.replies'),
  reposts: i18n.t('metric.reposts'),
  views: i18n.t('metric.views'),
  score: i18n.t('metric.score'),
};

export interface CommentSectionHandle {
  openDialog: () => void;
}

interface CommentSectionProps {
  descriptor: CommentThreadDescriptor;
  onRequest: CommentRequest;
}

function mergeSnapshots(
  current: CommentSnapshot | undefined,
  incoming: CommentSnapshot,
  exhausted: boolean,
): CommentSnapshot {
  if (
    !current ||
    current.targetId !== incoming.targetId ||
    current.scope !== incoming.scope ||
    current.rootId !== incoming.rootId
  ) {
    return { ...incoming, hasMore: exhausted ? false : incoming.hasMore };
  }

  const items = new Map(current.items.map((item) => [item.id, item]));
  incoming.items.forEach((item) => items.set(item.id, item));
  return {
    ...incoming,
    items: Array.from(items.values()),
    hasMore: exhausted ? false : incoming.hasMore,
  };
}

function CommentItemView({ item, onPreview, onOpenReplies }: {
  item: CommentItem;
  onPreview: (image: FeedImage) => void;
  onOpenReplies?: (item: CommentItem) => void;
}) {
  return (
    <article
      className={`comment-item${item.parentId ? ' comment-item-reply' : ''}`}
      data-comment-id={item.id}
    >
      <header className="comment-author-row">
        {item.author.avatar ? (
          <img className="comment-avatar" src={item.author.avatar} alt="" loading="lazy" />
        ) : (
          <span className="comment-avatar comment-avatar-fallback" aria-hidden="true">
            {item.author.name.trim().slice(0, 1)}
          </span>
        )}
        <span>
          <strong>{item.author.name}</strong>
          {(item.publishedAt !== undefined || item.metadataLabels?.length) && (
            <small>
              {item.publishedAt !== undefined && formatDateTime(item.publishedAt)}
              {item.publishedAt !== undefined && item.metadataLabels?.length ? ' · ' : ''}
              {item.metadataLabels?.join(' · ')}
            </small>
          )}
        </span>
      </header>
      <div className="comment-body block-stack">
        {item.body.map((block, index) => (
          <BlockRenderer
            block={block}
            expanded
            onPreview={onPreview}
            compactGallery
            key={`${block.type}-${index}`}
          />
        ))}
      </div>
      {!!(item.metrics.length || item.replyCount) && (
        <footer className="comment-meta">
          {item.metrics.map((metric) => (
            <span key={metric.kind}>
              {metric.label || metricLabels[metric.kind]} {formatNumber(metric.value)}
            </span>
          ))}
          {!!item.replyCount && (onOpenReplies ? (
            <button
              className="comment-replies-button"
              type="button"
              onClick={(event) => {
                event.currentTarget.focus();
                onOpenReplies(item);
              }}
            >
              {i18n.t('comment.replyCount', item.replyCount, [formatNumber(item.replyCount)])}
            </button>
          ) : (
            <span>{i18n.t('comment.replyCount', item.replyCount, [formatNumber(item.replyCount)])}</span>
          ))}
        </footer>
      )}
    </article>
  );
}

function CommentList({ items, onPreview, onOpenReplies }: {
  items: CommentItem[];
  onPreview: (image: FeedImage) => void;
  onOpenReplies?: (item: CommentItem) => void;
}) {
  return (
    <div className="comment-list">
      {items.map((item) => (
        <CommentItemView
          item={item}
          onPreview={onPreview}
          onOpenReplies={onOpenReplies}
          key={item.id}
        />
      ))}
    </div>
  );
}

function CommentsDialog({
  snapshot,
  fallbackItems,
  fallbackTotal,
  replyRoot,
  active,
  status,
  retryable,
  onClose,
  onLoadMore,
  onOpenReplies,
  onRetry,
  onPreview,
}: {
  snapshot?: CommentSnapshot;
  fallbackItems: CommentItem[];
  fallbackTotal: number;
  replyRoot?: CommentItem;
  active: boolean;
  status: CommentStatus;
  retryable: boolean;
  onClose: () => void;
  onLoadMore: () => void;
  onOpenReplies?: (item: CommentItem) => void;
  onRetry: () => void;
  onPreview: (image: FeedImage) => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const items = snapshot?.items.length ? snapshot.items : fallbackItems;
  const isReplyView = Boolean(replyRoot);
  const titleId = isReplyView ? 'replies-dialog-title' : 'comments-dialog-title';

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!active) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [active, onClose]);

  return (
    <div
      className={`comments-dialog-backdrop${isReplyView
        ? ' comments-dialog-backdrop--reply'
        : ''}`}
      role="presentation"
      aria-hidden={active ? undefined : true}
      onMouseDown={(event) => {
        if (active && event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className={`comments-dialog${isReplyView ? ' comments-dialog--reply' : ''}`}
        role="dialog"
        aria-modal={active ? 'true' : undefined}
        aria-labelledby={titleId}
      >
        <header>
          <div>
            <h2 id={titleId}>{isReplyView
              ? i18n.t('comment.replies')
              : i18n.t('comment.comments')}</h2>
            <span>{formatNumber(snapshot?.total ?? fallbackTotal)}</span>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={isReplyView
              ? i18n.t('comment.closeReplies')
              : i18n.t('comment.closeComments')}
          >
            {i18n.t('common.close')}
          </button>
        </header>
        <div
          className="comments-dialog-scroll"
          onScroll={(event) => {
            const element = event.currentTarget;
            if (element.scrollHeight - element.scrollTop - element.clientHeight < 240) {
              onLoadMore();
            }
          }}
        >
          {replyRoot && (
            <CommentItemView
              item={{ ...replyRoot, parentId: undefined }}
              onPreview={onPreview}
            />
          )}
          <CommentList
            items={items}
            onPreview={onPreview}
            onOpenReplies={isReplyView ? undefined : onOpenReplies}
          />
          {status === 'loading' && (
            <p className="comment-status" role="status">
              {isReplyView
                ? i18n.t('comment.loadingReplies')
                : i18n.t('comment.loadingComments')}
            </p>
          )}
          {!items.length && status === 'ready' && (
            <p className="comment-status">{isReplyView
              ? i18n.t('comment.emptyReplies')
              : i18n.t('comment.emptyComments')}</p>
          )}
          {status === 'failed' && (
            <p className="comment-status" role="alert">
              {isReplyView
                ? i18n.t('comment.failedReplies')
                : i18n.t('comment.failedComments')}
              {retryable && <button type="button" onClick={onRetry}>{i18n.t('common.retry')}</button>}
            </p>
          )}
          {snapshot && !snapshot.hasMore && status !== 'loading' && (
            <p className="comment-status">{isReplyView
              ? i18n.t('comment.allReplies')
              : i18n.t('comment.allComments')}</p>
          )}
        </div>
      </section>
    </div>
  );
}

/** 平台无关的评论弹层状态机；主评论常驻，回复只作为单独的上层弹窗。 */
export const CommentSection = forwardRef<CommentSectionHandle, CommentSectionProps>(
  function CommentSection({ descriptor, onRequest }, ref) {
    const returnFocusRef = useRef<HTMLElement | null>(null);
    const replyReturnFocusRef = useRef<HTMLElement | null>(null);
    const activeRequest = useRef(0);
    const requestPending = useRef(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [status, setStatus] = useState<CommentStatus>('idle');
    const [retryable, setRetryable] = useState(false);
    const [failedCommand, setFailedCommand] = useState<CommentCommand>();
    const [preview, setPreview] = useState<CommentSnapshot>();
    const [all, setAll] = useState<CommentSnapshot>();
    const [replyRoot, setReplyRoot] = useState<CommentItem>();
    const [replies, setReplies] = useState<CommentSnapshot>();
    const [imagePreview, setImagePreview] = useState<FeedImage>();

    useEffect(() => () => {
      activeRequest.current += 1;
      requestPending.current = false;
    }, []);

    const execute = async (command: CommentCommand): Promise<boolean> => {
      if (requestPending.current) return false;
      requestPending.current = true;
      const requestId = ++activeRequest.current;
      setStatus('loading');
      setRetryable(false);
      setFailedCommand(undefined);

      let result: CommentRequestResult;
      try {
        result = await onRequest(command);
      } catch {
        result = { kind: 'failed', retryable: true };
      }
      if (requestId !== activeRequest.current) return false;
      requestPending.current = false;

      if (result.kind === 'failed') {
        setStatus('failed');
        setRetryable(result.retryable);
        setFailedCommand(command);
        return false;
      }
      if (result.kind === 'closed') {
        setStatus('ready');
        return true;
      }

      const snapshot = result.kind === 'exhausted'
        ? { ...result.snapshot, hasMore: false }
        : result.snapshot;
      if (snapshot.targetId !== descriptor.targetId) {
        setStatus('failed');
        setRetryable(true);
        setFailedCommand(command);
        return false;
      }
      if (
        snapshot.scope === 'replies' &&
        snapshot.rootId !== ('commentId' in command ? command.commentId : replyRoot?.id)
      ) {
        setStatus('failed');
        setRetryable(true);
        setFailedCommand(command);
        return false;
      }
      if (snapshot.scope === 'preview') {
        setPreview(snapshot);
      } else if (snapshot.scope === 'replies') {
        if (command.kind === 'loadMore') {
          setReplies((current) => mergeSnapshots(
            current,
            snapshot,
            result.kind === 'exhausted',
          ));
        } else {
          setReplies(snapshot);
        }
      } else if (command.kind === 'loadMore') {
        setAll((current) => mergeSnapshots(current, snapshot, result.kind === 'exhausted'));
      } else {
        setAll(snapshot);
      }
      setStatus('ready');
      return true;
    };

    const loadInitialComments = async () => {
      const previewLoaded = descriptor.capabilities.preview
        ? await execute({ kind: 'openPreview', targetId: descriptor.targetId })
        : true;
      if (previewLoaded && descriptor.capabilities.all) {
        await execute({ kind: 'openAll', targetId: descriptor.targetId });
      }
    };

    const openDialog = () => {
      returnFocusRef.current = document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
      setDialogOpen(true);
      if (descriptor.count === 0) {
        setAll({
          targetId: descriptor.targetId,
          scope: 'all',
          total: 0,
          items: [],
          hasMore: false,
        });
        setStatus('ready');
        return;
      }
      void loadInitialComments();
    };

    useImperativeHandle(ref, () => ({ openDialog }));

    const closeAll = () => {
      activeRequest.current += 1;
      requestPending.current = false;
      setReplyRoot(undefined);
      setReplies(undefined);
      setDialogOpen(false);
      setStatus('ready');
      returnFocusRef.current?.focus();
      void onRequest({ kind: 'closeAll', targetId: descriptor.targetId }).catch(() => undefined);
    };
    const closeReplies = () => {
      activeRequest.current += 1;
      requestPending.current = false;
      setReplyRoot(undefined);
      setReplies(undefined);
      setStatus('ready');
      setRetryable(false);
      setFailedCommand(undefined);
      replyReturnFocusRef.current?.focus();
      void onRequest({ kind: 'closeReplies', targetId: descriptor.targetId })
        .catch(() => undefined);
    };
    const openReplies = (item: CommentItem) => {
      if (!descriptor.capabilities.replies || !item.replyCount || requestPending.current) return;
      replyReturnFocusRef.current = document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
      setReplyRoot(item);
      setReplies(undefined);
      void execute({
        kind: 'openReplies',
        targetId: descriptor.targetId,
        commentId: item.id,
      });
    };
    const loadMore = () => {
      if (replyRoot) {
        if (!replies?.hasMore || requestPending.current) return;
        void execute({ kind: 'loadMore', targetId: descriptor.targetId });
        return;
      }
      if (!descriptor.capabilities.loadMore || !all?.hasMore || requestPending.current) return;
      void execute({ kind: 'loadMore', targetId: descriptor.targetId });
    };
    const retry = () => {
      if (failedCommand?.kind === 'openPreview') {
        void loadInitialComments();
      } else if (failedCommand) {
        void execute(failedCommand);
      }
    };

    return (
      <>
        {dialogOpen && (
          <>
            <CommentsDialog
              snapshot={all}
              fallbackItems={preview?.items || []}
              fallbackTotal={preview?.total ?? descriptor.count}
              active={!replyRoot}
              status={status}
              retryable={retryable}
              onClose={closeAll}
              onLoadMore={loadMore}
              onOpenReplies={openReplies}
              onRetry={retry}
              onPreview={setImagePreview}
            />
            {replyRoot && (
              <CommentsDialog
                snapshot={replies}
                fallbackItems={[]}
                fallbackTotal={replyRoot.replyCount || 0}
                replyRoot={replyRoot}
                active
                status={status}
                retryable={retryable}
                onClose={closeReplies}
                onLoadMore={loadMore}
                onRetry={retry}
                onPreview={setImagePreview}
              />
            )}
          </>
        )}
        {imagePreview && (
          <button
            className="lightbox comment-lightbox"
            type="button"
            onClick={() => setImagePreview(undefined)}
            aria-label={i18n.t('comment.closeImagePreview')}
          >
            <img src={imagePreview.url} alt={imagePreview.alt || i18n.t('comment.image')} />
            <span>{i18n.t('common.clickAnywhereToClose')}</span>
          </button>
        )}
      </>
    );
  },
);
