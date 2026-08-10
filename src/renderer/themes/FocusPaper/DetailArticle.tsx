import { useState } from 'react';
import type { ArticleDetail } from '../../../types/detail';
import type { FeedActionDescriptor, FeedImage } from '../../../types/feed';
import { ActionBar } from '../../components/ActionBar';
import { BlockRenderer } from '../../components/BlockRenderer';

interface DetailArticleProps {
  content: ArticleDetail;
  onAction: (action: FeedActionDescriptor) => void;
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

export function DetailArticle({ content, onAction }: DetailArticleProps) {
  const [preview, setPreview] = useState<FeedImage>();

  return (
    <article className="detail-article">
      {content.flags && Object.values(content.flags).some(Boolean) && (
        <div className="flag-row" aria-label="内容状态">
          {content.flags.pinned && <span>置顶</span>}
          {content.flags.sensitive && <span>敏感内容</span>}
          {content.flags.spoiler && <span>含剧透</span>}
          {content.flags.locked && <span>已锁定</span>}
        </div>
      )}

      <div className="author-row">
        {content.author.avatar ? (
          <img className="avatar" src={content.author.avatar} alt="" />
        ) : (
          <span className="avatar avatar-fallback" aria-hidden="true">
            {content.source.name.slice(0, 1)}
          </span>
        )}
        <div>
          <strong>{content.author.name}</strong>
          <span>
            来自{content.source.name}
            {content.publishedAt !== undefined && (
              <> · <time>{formatPublishedAt(content.publishedAt)}</time></>
            )}
            {content.updatedAt !== undefined && ' · 已编辑'}
          </span>
        </div>
      </div>

      {content.title && <h1>{content.title}</h1>}

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

      <ActionBar
        originalUrl={content.originalUrl}
        metrics={content.metrics}
        actions={content.actions}
        onAction={onAction}
      />

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
    </article>
  );
}
