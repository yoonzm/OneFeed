import { useState } from 'react';
import type { FeedActionDescriptor, FeedImage, FeedItem } from '../../../types/feed';
import { ActionBar } from '../../components/ActionBar';
import { BlockRenderer } from '../../components/BlockRenderer';

interface CardProps {
  item: FeedItem;
  index: number;
  onAction: (item: FeedItem, action: FeedActionDescriptor) => void;
}

// 密度阈值只影响列表留白，不裁剪协议数据；Array.from 按 Unicode 字符而非 UTF-16 单元计数。
const COMPACT_TEXT_LENGTH = 40;
const COMPACT_TITLE_LENGTH = 32;

/** 仅压缩结构简单的短内容，带媒体或多 Block 的卡片保留舒适布局。 */
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

/** Focus Paper 的通用列表卡片；平台差异应在 Adapter 归一化阶段消化。 */
export function Card({ item, index, onAction }: CardProps) {
  const [expanded, setExpanded] = useState(false);
  const [preview, setPreview] = useState<FeedImage>();
  // 260 字是交互阈值，不等于固定行数；实际折叠高度由主题 CSS 控制。
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

        {/* 列表标题已承担原文跳转，Card 不再重复显示 open 操作。 */}
        <ActionBar
          originalUrl={item.originalUrl}
          metrics={item.metrics}
          actions={item.actions.filter((action) => action.kind !== 'open')}
          onAction={(action) => onAction(item, action)}
        />
      </div>

      {/* 预览状态属于单张 Card，关闭后不会影响其他卡片的媒体状态。 */}
      {preview && (
        <button className="lightbox" type="button" onClick={() => setPreview(undefined)} aria-label="关闭图片预览">
          <img src={preview.url} alt={preview.alt || '预览图片'} />
          <span>点击任意位置关闭</span>
        </button>
      )}
    </article>
  );
}
