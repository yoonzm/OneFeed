import { useRef, useState } from 'react';
import type { ArticleDetail } from '../../../types/detail';
import type { CommentCommand, CommentRequestResult } from '../../../types/comments';
import type { FeedActionDescriptor, FeedImage } from '../../../types/feed';
import { formatDateTime, i18n } from '../../../i18n';
import { ActionBar } from '../../components/ActionBar';
import { BlockRenderer } from '../../components/BlockRenderer';
import {
  CommentSection,
  type CommentSectionHandle,
} from '../../components/CommentSection';

interface DetailArticleProps {
  content: ArticleDetail;
  onAction: (action: FeedActionDescriptor) => void;
  onCommentRequest?: (command: CommentCommand) => Promise<CommentRequestResult>;
}

/** 单篇正文视图：保留作者元信息，并始终完整渲染所有标准 Block。 */
export function DetailArticle({ content, onAction, onCommentRequest }: DetailArticleProps) {
  const [preview, setPreview] = useState<FeedImage>();
  const commentsRef = useRef<CommentSectionHandle>(null);

  const handleAction = (action: FeedActionDescriptor) => {
    if (action.kind === 'reply' && content.comments && onCommentRequest) {
      commentsRef.current?.openDialog();
      return;
    }
    onAction(action);
  };

  return (
    <article className="detail-article">
      {content.flags && Object.values(content.flags).some(Boolean) && (
        <div className="flag-row" aria-label={i18n.t('common.contentStatus')}>
          {content.flags.pinned && <span>{i18n.t('common.flagPinned')}</span>}
          {content.flags.sensitive && <span>{i18n.t('common.flagSensitive')}</span>}
          {content.flags.spoiler && <span>{i18n.t('common.flagSpoiler')}</span>}
          {content.flags.locked && <span>{i18n.t('common.flagLocked')}</span>}
        </div>
      )}

      {content.title && <h1>{content.title}</h1>}

      {content.context && (
        !!content.context.body.length || content.context.navigation
      ) && (
        <div className="detail-context detail-body block-stack">
          {content.context.body.map((block, blockIndex) => (
            <BlockRenderer
              block={block}
              expanded
              onPreview={setPreview}
              key={`${block.type}-${blockIndex}`}
            />
          ))}
          {content.context.navigation && (
            <a
              className="detail-context-navigation"
              href={content.context.navigation.url}
              target="_blank"
              rel="noreferrer"
            >
              {content.context.navigation.label} →
            </a>
          )}
        </div>
      )}

      <div className="author-row">
        {content.author.avatar ? (
          <img className="avatar" src={content.author.avatar} alt="" />
        ) : (
          <span className="avatar avatar-fallback" aria-hidden="true">
            {content.author.name.trim().slice(0, 1)}
          </span>
        )}
        <div>
          <strong>{content.author.name}</strong>
          {(content.publishedAt !== undefined || content.updatedAt !== undefined) && (
            <span>
              {content.publishedAt !== undefined && (
                <time>{formatDateTime(content.publishedAt)}</time>
              )}
              {content.publishedAt !== undefined && content.updatedAt !== undefined && ' · '}
              {content.updatedAt !== undefined && i18n.t('reader.edited')}
            </span>
          )}
        </div>
        {content.actionSlots?.author && (
          <ActionBar
            originalUrl={content.originalUrl}
            metrics={content.actionSlots.author.metrics}
            actions={content.actionSlots.author.actions}
            onAction={handleAction}
          />
        )}
      </div>

      {/* 详情正文不复用 Feed Card 的预览折叠规则。 */}
      <div className="detail-body block-stack">
        {content.body.map((block, blockIndex) => (
          <BlockRenderer
            block={block}
            expanded
            onPreview={setPreview}
            key={`${block.type}-${blockIndex}`}
          />
        ))}
      </div>

      {content.actionSlots?.footer && (
        <ActionBar
          originalUrl={content.originalUrl}
          metrics={content.actionSlots.footer.metrics}
          actions={content.actionSlots.footer.actions}
          onAction={handleAction}
        />
      )}

      {content.comments && onCommentRequest && (
        <CommentSection
          key={content.comments.targetId}
          ref={commentsRef}
          descriptor={content.comments}
          onRequest={onCommentRequest}
        />
      )}

      {preview && (
        <button
          className="lightbox"
          type="button"
          onClick={() => setPreview(undefined)}
          aria-label={i18n.t('common.closeImagePreview')}
        >
          <img src={preview.url} alt={preview.alt || i18n.t('common.imagePreview')} />
          <span>{i18n.t('common.clickAnywhereToClose')}</span>
        </button>
      )}
    </article>
  );
}
