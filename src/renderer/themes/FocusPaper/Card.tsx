import { Check } from '@phosphor-icons/react';
import { useState } from 'react';
import type { FeedActionDescriptor, FeedImage, FeedItem } from '../../../types/feed';
import { ActionBar } from '../../components/ActionBar';
import { BlockRenderer } from '../../components/BlockRenderer';

interface CardProps {
  item: FeedItem;
  index: number;
  isSeen?: boolean;
  onSeen?: () => void;
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

/** 文字与单张常规比例图片组合时，图片作为辅助信息收敛到卡片右侧。 */
function getSideGallery(item: FeedItem) {
  const galleryBlocks = item.previewBlocks.filter((block) => block.type === 'gallery');
  const hasRichText = item.previewBlocks.some((block) => block.type === 'richText');
  const hasOtherBlocks = item.previewBlocks.some(
    (block) => block.type !== 'richText' && block.type !== 'gallery',
  );
  const gallery = galleryBlocks[0];

  if (!hasRichText || hasOtherBlocks || galleryBlocks.length !== 1 || gallery?.items.length !== 1) {
    return undefined;
  }

  const image = gallery.items[0];
  const aspectRatio = image?.aspectRatio
    || (image?.width && image.height ? image.width / image.height : undefined);
  if (aspectRatio && (aspectRatio < 0.75 || aspectRatio > 2.2)) return undefined;

  return gallery;
}

function formatPublishedAt(value: string | number): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/** Focus Paper 的通用列表卡片；平台差异应在 Adapter 归一化阶段消化。 */
export function Card({
  item,
  index,
  isSeen = false,
  onSeen,
  onAction,
}: CardProps) {
  const [expanded, setExpanded] = useState(false);
  const [preview, setPreview] = useState<FeedImage>();
  // 260 字仅决定是否提供展开操作；所有列表正文默认由主题 CSS 收敛到两行。
  const expandable = item.previewBlocks.some(
    (block) => block.type === 'richText' && block.plainText.length > 260,
  );
  const contentExpanded = expanded;
  const densityClassName = getDensityClassName(item);
  const sideGallery = getSideGallery(item);
  const contentBlocks = sideGallery
    ? item.previewBlocks.filter((block) => block !== sideGallery)
    : item.previewBlocks;
  const authorAvatar = item.author.avatar ? (
    <img className="card-author-avatar" src={item.author.avatar} alt="" loading="lazy" />
  ) : null;

  return (
    <article
      className={`feed-card feed-card-${item.kind} feed-card-${item.role} ${item.title ? 'feed-card-titled' : 'feed-card-untitled'} ${sideGallery ? 'feed-card-side-media' : ''} ${densityClassName} ${isSeen ? 'feed-card-seen' : ''}`.trim()}
      data-seen={isSeen ? 'true' : undefined}
    >
      <div className="card-main">
        {item.title && (
          <div className="card-title-row">
            <h2>
              <a href={item.originalUrl} target="_blank" rel="noreferrer" onClick={onSeen}>
                {item.title}
              </a>
            </h2>
          </div>
        )}

        {!!contentBlocks.length && (
          <div className="card-body-row block-stack">
            {contentBlocks.map((block, blockIndex) => (
              <BlockRenderer
                block={block}
                expanded={contentExpanded}
                onPreview={setPreview}
                compactGallery
                key={`${block.type}-${blockIndex}`}
              />
            ))}
          </div>
        )}

        {sideGallery && (
          <div className="card-media-aside">
            <BlockRenderer
              block={sideGallery}
              expanded={contentExpanded}
              onPreview={setPreview}
              compactGallery
            />
          </div>
        )}

        {/* 作者、上下文、状态和操作统一收敛到最后一行；头像仅在源站提供时显示。 */}
        <div className="card-meta-row">
          <span className="card-index" aria-label={`第 ${item.sequence || index + 1} 条`}>
            {String(item.sequence || index + 1).padStart(2, '0')}
          </span>
          {item.author.link ? (
            <a className="card-author" href={item.author.link} target="_blank" rel="noreferrer">
              {authorAvatar}
              {item.author.name}
            </a>
          ) : (
            <span className="card-author">
              {authorAvatar}
              {item.author.name}
            </span>
          )}
          {item.publishedAt !== undefined && (
            <span className="card-time">
              <time>{formatPublishedAt(item.publishedAt)}</time>
            </span>
          )}

          {(item.context?.reason || item.context?.community || item.context?.tags?.length) && (
            <span className="context-row">
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
            </span>
          )}

          {item.flags && Object.values(item.flags).some(Boolean) && (
            <span className="flag-row" aria-label="内容状态">
              {item.flags.pinned && <span>置顶</span>}
              {item.flags.sensitive && <span>敏感内容</span>}
              {item.flags.spoiler && <span>含剧透</span>}
              {item.flags.locked && <span>已锁定</span>}
            </span>
          )}

          {expandable && (
            <button
              className="text-action"
              type="button"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? '收起' : '展开全文'}
            </button>
          )}

          {!item.title && (
            <a
              className="card-detail-link"
              href={item.originalUrl}
              target="_blank"
              rel="noreferrer"
              onClick={onSeen}
            >
              查看详情 ↗
            </a>
          )}

          {/* 有标题时由标题承担详情跳转；无标题条目使用上方的统一详情入口。 */}
          <ActionBar
            originalUrl={item.originalUrl}
            metrics={item.metrics}
            actions={item.actions.filter((action) => action.kind !== 'open')}
            onAction={(action) => onAction(item, action)}
          />
        </div>
      </div>

      {isSeen && (
        <span className="card-seen-marker">
          <Check size={10} weight="bold" aria-hidden="true" />
          已看过
        </span>
      )}

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
