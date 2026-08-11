import { useState } from 'react';
import type { FeedActionDescriptor, FeedImage, FeedItem } from '../../../types/feed';
import { ActionBar } from '../../components/ActionBar';
import { BlockRenderer } from '../../components/BlockRenderer';

interface CardProps {
  item: FeedItem;
  index: number;
  onAction: (item: FeedItem, action: FeedActionDescriptor) => void;
}

const COMPACT_TEXT_LENGTH = 40;
const COMPACT_TITLE_LENGTH = 32;

function getDensityClassName(item: FeedItem): string {
  const titleLength = Array.from(item.title?.trim() || '').length;
  if (titleLength && titleLength <= COMPACT_TITLE_LENGTH && !item.previewBlocks.length) {
    return 'feed-card-compact';
  }

  if (item.title || item.previewBlocks.length !== 1) return '';

  const block = item.previewBlocks[0];
  if (!block || block.type !== 'richText') return '';

  const textLength = Array.from(block.plainText.trim()).length;
  if (!textLength || textLength > COMPACT_TEXT_LENGTH) return '';

  return 'feed-card-compact';
}

export function Card({ item, index, onAction }: CardProps) {
  const [expanded, setExpanded] = useState(false);
  const [preview, setPreview] = useState<FeedImage>();
  const expandable = item.previewBlocks.some(
    (block) => block.type === 'richText' && block.plainText.length > 260,
  );
  const contentExpanded = expanded || !expandable;
  const densityClassName = getDensityClassName(item);

  return (
    <article
      className={`feed-card feed-card-${item.kind} feed-card-${item.role} ${densityClassName}`.trim()}
    >
      <div className="card-index" aria-hidden="true">
        {String(item.sequence || index + 1).padStart(2, '0')}
      </div>
      <div className="card-main">
        {(item.context?.reason || item.context?.community || item.context?.tags?.length) && (
          <div className="context-row">
            {item.context.reason && <span>{item.context.reason.label}</span>}
            {item.context.community && (
              item.context.community.url ? (
                <a href={item.context.community.url} target="_blank" rel="noreferrer">
                  {item.context.community.name}
                </a>
              ) : <span>{item.context.community.name}</span>
            )}
            {item.context.tags?.map((tag) => tag.url ? (
              <a href={tag.url} target="_blank" rel="noreferrer" key={tag.id || tag.name}>
                #{tag.name}
              </a>
            ) : <span key={tag.id || tag.name}>#{tag.name}</span>)}
          </div>
        )}

        {item.flags && Object.values(item.flags).some(Boolean) && (
          <div className="flag-row" aria-label="内容状态">
            {item.flags.pinned && <span>置顶</span>}
            {item.flags.sensitive && <span>敏感内容</span>}
            {item.flags.spoiler && <span>含剧透</span>}
            {item.flags.locked && <span>已锁定</span>}
          </div>
        )}

        {item.title && (
          <h2>
            <a href={item.originalUrl} target="_blank" rel="noreferrer">{item.title}</a>
          </h2>
        )}

        {!!item.previewBlocks.length && (
          <div className="block-stack">
            {item.previewBlocks.map((block, blockIndex) => (
              <BlockRenderer
                block={block}
                expanded={contentExpanded}
                onPreview={setPreview}
                key={`${block.type}-${blockIndex}`}
              />
            ))}
          </div>
        )}

        {expandable && (
          <button className="text-action" type="button" onClick={() => setExpanded(!expanded)}>
            {expanded ? '收起' : '展开全文'}
          </button>
        )}

        <ActionBar
          originalUrl={item.originalUrl}
          metrics={item.metrics}
          actions={item.actions.filter((action) => action.kind !== 'open')}
          onAction={(action) => onAction(item, action)}
        />
      </div>

      {preview && (
        <button className="lightbox" type="button" onClick={() => setPreview(undefined)} aria-label="关闭图片预览">
          <img src={preview.url} alt={preview.alt || '预览图片'} />
          <span>点击任意位置关闭</span>
        </button>
      )}
    </article>
  );
}
