import { useLayoutEffect, useRef, useState } from 'react';
import type { ThreadDetail as ThreadDetailContent } from '../../../types/detail';
import type { FeedActionDescriptor, FeedImage } from '../../../types/feed';
import { formatDateTime, formatNumber, i18n } from '../../../i18n';
import { ActionBar } from '../../components/ActionBar';
import { BlockRenderer } from '../../components/BlockRenderer';
import { hasExpandableText } from './contentItemUtils';
import { ThreadEntry } from './ThreadEntry';

interface ThreadDetailProps {
  content: ThreadDetailContent;
  hideImages?: boolean;
  onAction: (
    itemId: string,
    originalUrl: string,
    action: FeedActionDescriptor,
  ) => void;
}

/** 讨论详情由独立主题头、Thread 条目和可选分页三部分组成。 */
export function ThreadDetail({ content, hideImages = false, onAction }: ThreadDetailProps) {
  const [preview, setPreview] = useState<FeedImage>();
  const [questionExpanded, setQuestionExpanded] = useState(false);
  const [questionTextOverflow, setQuestionTextOverflow] = useState(false);
  const questionBodyRef = useRef<HTMLDivElement>(null);
  const replyMetric = content.header.metrics.find((metric) => metric.kind === 'replies');
  // 原站总数可能大于当前已解析条目数；没有可用统计值时再回退到本地长度。
  const totalEntries = replyMetric?.value || content.entries.length;
  const entryTitle = content.entryKind === 'answer'
    ? i18n.t('reader.answers')
    : i18n.t('reader.replies');
  const entryListLabel = content.entryKind === 'answer'
    ? i18n.t('reader.answerList')
    : i18n.t('reader.replyList');
  const isQuestion = content.header.role === 'question';
  const questionBodyHasKnownOverflow = isQuestion && (
    hasExpandableText(content.header.body) ||
    content.header.body.filter((block) => block.type === 'richText').length > 1 ||
    content.header.body.some((block) => block.type !== 'richText')
  );
  const questionBodyExpandable = isQuestion && (
    questionBodyHasKnownOverflow || questionTextOverflow
  );
  const headerBodyExpanded = !isQuestion || questionExpanded;
  // 问题折叠态只保留第一段文字，主题帖则始终按完整正文渲染。
  const headerBlocks = headerBodyExpanded
    ? content.header.body
    : content.header.body.filter((block) => block.type === 'richText').slice(0, 1);

  useLayoutEffect(() => {
    if (!isQuestion || questionExpanded || questionBodyHasKnownOverflow) return;
    const element = questionBodyRef.current?.querySelector<HTMLElement>('.content');
    const measureOverflow = () => {
      setQuestionTextOverflow(Boolean(element && element.scrollHeight > element.clientHeight));
    };

    measureOverflow();
    window.addEventListener('resize', measureOverflow);
    return () => window.removeEventListener('resize', measureOverflow);
  }, [content.header.body, isQuestion, questionBodyHasKnownOverflow, questionExpanded]);

  return (
    <>
      <article className="thread-header">
        {(content.header.context?.community || content.header.context?.tags?.length) && (
          <div className="context-row">
            {content.header.context.community && (
              content.header.context.community.url ? (
                <a href={content.header.context.community.url} target="_blank" rel="noreferrer">
                  {content.header.context.community.name}
                </a>
              ) : <span>{content.header.context.community.name}</span>
            )}
            {content.header.context.tags?.map((tag) => tag.url ? (
              <a href={tag.url} target="_blank" rel="noreferrer" key={tag.id || tag.name}>
                #{tag.name}
              </a>
            ) : <span key={tag.id || tag.name}>#{tag.name}</span>)}
          </div>
        )}

        {content.header.flags && Object.values(content.header.flags).some(Boolean) && (
          <div className="flag-row" aria-label={i18n.t('common.contentStatus')}>
            {content.header.flags.pinned && <span>{i18n.t('common.flagPinned')}</span>}
            {content.header.flags.sensitive && <span>{i18n.t('common.flagSensitive')}</span>}
            {content.header.flags.spoiler && <span>{i18n.t('common.flagSpoiler')}</span>}
            {content.header.flags.locked && <span>{i18n.t('common.flagLocked')}</span>}
          </div>
        )}

        <h1>{content.header.title}</h1>

        {content.header.author && (
          <div className="author-row">
            {content.header.author.avatar ? (
              <img className="avatar" src={content.header.author.avatar} alt="" />
            ) : (
              <span className="avatar avatar-fallback" aria-hidden="true">
                {content.header.author.name.trim().slice(0, 1)}
              </span>
            )}
            <div>
              <strong>{content.header.author.name}</strong>
              {content.header.publishedAt !== undefined && (
                <span><time>{formatDateTime(content.header.publishedAt)}</time></span>
              )}
            </div>
          </div>
        )}

        {!!content.header.body.length && (
          <div className="thread-body detail-body block-stack" ref={questionBodyRef}>
            {headerBlocks.map((block, blockIndex) => (
              <BlockRenderer
                block={block}
                expanded={headerBodyExpanded}
                hideImages={hideImages}
                onPreview={setPreview}
                key={`${block.type}-${blockIndex}`}
              />
            ))}
          </div>
        )}

        {questionBodyExpandable && (
          <button
            className="text-action thread-question-toggle"
            type="button"
            aria-expanded={questionExpanded}
            onClick={() => setQuestionExpanded(!questionExpanded)}
          >
            {questionExpanded
              ? i18n.t('reader.collapseQuestion')
              : i18n.t('reader.expandQuestion')}
          </button>
        )}

        <ActionBar
          originalUrl={content.header.originalUrl}
          metrics={content.header.metrics}
          actions={content.header.actions}
          surface="detail"
          onAction={(action) => onAction(
            content.header.id,
            content.header.originalUrl,
            action,
          )}
        />
      </article>

      <section className="thread-entries" aria-label={entryListLabel}>
        <header className="thread-list-header">
          <h2>{entryTitle}</h2>
          <span>{i18n.t(
            content.entryKind === 'answer' ? 'reader.answerCount' : 'reader.replyCount',
            totalEntries,
            [formatNumber(totalEntries)],
          )}</span>
        </header>
        {/* Answer 只提供详情预览；Reply 作为讨论组成部分在当前线程内阅读。 */}
        {content.entries.length ? content.entries.map((item, index) => (
          <ThreadEntry
            item={item}
            index={index}
            hideImages={hideImages}
            key={item.id}
            onAction={(entry, action) => onAction(entry.id, entry.originalUrl, action)}
          />
        )) : (
          <section className="thread-empty" aria-live="polite">
            {i18n.t(content.entryKind === 'answer'
              ? 'reader.loadingAnswers'
              : 'reader.loadingReplies')}
          </section>
        )}
      </section>

      {/* paged 模式使用原站 URL 导航；infinite 模式由 DetailApp 的滚动同步负责。 */}
      {content.pagination && content.pagination.totalPages > 1 && (
        <nav className="thread-pagination" aria-label={i18n.t('common.pagination')}>
          {content.pagination.previousUrl ? (
            <a href={content.pagination.previousUrl}>{i18n.t('common.previousPage')}</a>
          ) : <span aria-disabled="true">{i18n.t('common.previousPage')}</span>}
          <strong>
            {content.pagination.currentPage} / {content.pagination.totalPages}
          </strong>
          {content.pagination.nextUrl ? (
            <a href={content.pagination.nextUrl}>{i18n.t('common.nextPage')}</a>
          ) : <span aria-disabled="true">{i18n.t('common.nextPage')}</span>}
        </nav>
      )}

      {preview && !hideImages && (
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
    </>
  );
}
