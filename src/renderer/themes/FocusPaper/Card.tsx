import { useState } from 'react';
import type { FeedAction, FeedItem, FeedSource } from '../../../types/feed';

interface CardProps {
  item: FeedItem;
  index: number;
  source: FeedSource;
  onAction: (item: FeedItem, action: FeedAction) => void;
}

export function Card({ item, index, source, onAction }: CardProps) {
  const [expanded, setExpanded] = useState(false);
  const [preview, setPreview] = useState<string>();

  return (
    <article className="feed-card">
      <div className="card-index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</div>
      <div className="card-main">
        <div className="author-row">
          {item.author.avatar ? (
            <img className="avatar" src={item.author.avatar} alt="" />
          ) : (
            <span className="avatar avatar-fallback" aria-hidden="true">{source.name.slice(0, 1)}</span>
          )}
          <div>
            <strong>{item.author.name}</strong>
            <span>来自{source.name}</span>
          </div>
        </div>

        {item.title && (
          <h2>
            <a href={item.originalUrl} target="_blank" rel="noreferrer">{item.title}</a>
          </h2>
        )}

        <div
          className={`content ${expanded ? 'content-expanded' : ''}`}
          dangerouslySetInnerHTML={{ __html: item.contentHtml }}
        />
        {item.contentHtml.length > 260 && (
          <button className="text-action" type="button" onClick={() => setExpanded(!expanded)}>
            {expanded ? '收起' : '展开全文'}
          </button>
        )}

        {!!item.media?.length && (
          <div className={`media-grid media-count-${Math.min(item.media.length, 3)}`}>
            {item.media.slice(0, 6).map((media, mediaIndex) => (
              <button
                className="media-button"
                type="button"
                key={`${media.url}-${mediaIndex}`}
                onClick={() => setPreview(media.url)}
                aria-label={`预览图片 ${mediaIndex + 1}`}
              >
                <img src={media.url} alt={media.alt || ''} loading="lazy" />
              </button>
            ))}
          </div>
        )}

        <footer className="card-actions">
          <button type="button" onClick={() => onAction(item, 'like')}>
            <span aria-hidden="true">△</span> {source.likeLabel} {item.stats.likes || ''}
          </button>
          <button type="button" onClick={() => onAction(item, 'comment')}>
            {source.commentLabel} {item.stats.comments || ''}
          </button>
          <a href={item.originalUrl} target="_blank" rel="noreferrer">查看原文 ↗</a>
        </footer>
      </div>

      {preview && (
        <button className="lightbox" type="button" onClick={() => setPreview(undefined)} aria-label="关闭图片预览">
          <img src={preview} alt="预览" />
          <span>点击任意位置关闭</span>
        </button>
      )}
    </article>
  );
}
