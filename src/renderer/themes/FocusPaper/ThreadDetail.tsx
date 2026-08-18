import { useState } from 'react';
import type { ThreadDetail as ThreadDetailContent } from '../../../types/detail';
import type { FeedActionDescriptor, FeedImage } from '../../../types/feed';
import { ActionBar } from '../../components/ActionBar';
import { BlockRenderer } from '../../components/BlockRenderer';
import { Card } from './Card';

interface ThreadDetailProps {
  content: ThreadDetailContent;
  onAction: (
    itemId: string,
    originalUrl: string,
    action: FeedActionDescriptor,
  ) => void;
}

function formatPublishedAt(value: string | number): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/** 讨论详情由独立主题头、标准 Card 条目和可选分页三部分组成。 */
export function ThreadDetail({ content, onAction }: ThreadDetailProps) {
  const [preview, setPreview] = useState<FeedImage>();
  const replyMetric = content.header.metrics.find((metric) => metric.kind === 'replies');
  // 原站总数可能大于当前已解析条目数；没有可用统计值时再回退到本地长度。
  const totalEntries = replyMetric?.value || content.entries.length;

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
          <div className="flag-row" aria-label="内容状态">
            {content.header.flags.pinned && <span>置顶</span>}
            {content.header.flags.sensitive && <span>敏感内容</span>}
            {content.header.flags.spoiler && <span>含剧透</span>}
            {content.header.flags.locked && <span>已锁定</span>}
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
                <span><time>{formatPublishedAt(content.header.publishedAt)}</time></span>
              )}
            </div>
          </div>
        )}

        {!!content.header.body.length && (
          <div className="thread-body detail-body block-stack">
            {content.header.body.map((block, blockIndex) => (
              <BlockRenderer
                block={block}
                expanded
                onPreview={setPreview}
                key={`${block.type}-${blockIndex}`}
              />
            ))}
          </div>
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

      <section className="thread-entries" aria-label={`${content.entryLabel}列表`}>
        <header className="thread-list-header">
          <h2>{content.entryLabel}</h2>
          <span>{totalEntries.toLocaleString('zh-CN')} 条</span>
        </header>
        {/* 回答和回复已处于完整讨论页：媒体留在正文流，并不再重复提供详情跳转。 */}
        {content.entries.length ? content.entries.map((item, index) => (
          <Card
            item={item}
            index={index}
            key={item.id}
            mediaMode="content"
            showDetailLink={false}
            onAction={(entry, action) => onAction(entry.id, entry.originalUrl, action)}
          />
        )) : (
          <section className="thread-empty" aria-live="polite">
            正在整理{content.entryLabel}…
          </section>
        )}
      </section>

      {/* paged 模式使用原站 URL 导航；infinite 模式由 DetailApp 的滚动同步负责。 */}
      {content.pagination && content.pagination.totalPages > 1 && (
        <nav className="thread-pagination" aria-label="分页">
          {content.pagination.previousUrl ? (
            <a href={content.pagination.previousUrl}>上一页</a>
          ) : <span aria-disabled="true">上一页</span>}
          <strong>
            {content.pagination.currentPage} / {content.pagination.totalPages}
          </strong>
          {content.pagination.nextUrl ? (
            <a href={content.pagination.nextUrl}>下一页</a>
          ) : <span aria-disabled="true">下一页</span>}
        </nav>
      )}

      {preview && (
        <button
          className="lightbox"
          type="button"
          onClick={() => setPreview(undefined)}
          aria-label="关闭图片预览"
        >
          <img src={preview.url} alt={preview.alt || '预览图片'} />
          <span>点击任意位置关闭</span>
        </button>
      )}
    </>
  );
}
