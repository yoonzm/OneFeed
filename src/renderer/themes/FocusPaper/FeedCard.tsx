import { Check } from '@phosphor-icons/react';
import { useState } from 'react';
import type { FeedActionDescriptor, FeedImage, FeedItem } from '../../../types/feed';
import { ActionBar } from '../../components/ActionBar';
import { BlockRenderer } from '../../components/BlockRenderer';
import {
  ItemBody,
  ItemLightbox,
  ItemMeta,
  ItemTitle,
} from './ContentItemParts';
import { getDensityClassName, hasExpandableText } from './contentItemUtils';

interface FeedCardProps {
  item: FeedItem;
  index: number;
  isSeen?: boolean;
  onSeen?: () => void;
  onAction: (item: FeedItem, action: FeedActionDescriptor) => void;
}

/** 文字与单张常规比例图片组合时，图片作为 Feed 辅助信息收敛到右侧。 */
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

/** Feed 专用卡片：负责预览截断、详情导航、已读状态和 Feed 媒体布局。 */
export function FeedCard({
  item,
  index,
  isSeen = false,
  onSeen,
  onAction,
}: FeedCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [preview, setPreview] = useState<FeedImage>();
  const expandable = hasExpandableText(item.previewBlocks);
  const densityClassName = getDensityClassName(item, item.previewBlocks);
  const sideGallery = getSideGallery(item);
  const contentBlocks = item.previewBlocks.filter((block) => block !== sideGallery);

  return (
    <article
      className={`item-card feed-card feed-card-${item.kind} feed-card-${item.role} ${item.title ? 'item-card-titled' : 'item-card-untitled'} ${sideGallery ? 'feed-card-side-media' : ''} ${densityClassName} ${isSeen ? 'feed-card-seen' : ''}`.trim()}
      data-seen={isSeen ? 'true' : undefined}
    >
      <div className="card-main">
        <ItemTitle item={item} linked onOpen={onSeen} />
        <ItemBody blocks={contentBlocks} expanded={expanded} onPreview={setPreview} />

        {sideGallery && (
          <div className="card-media-aside">
            <BlockRenderer
              block={sideGallery}
              expanded={expanded}
              onPreview={setPreview}
              compactGallery
            />
          </div>
        )}

        <ItemMeta item={item} index={index}>
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

          <ActionBar
            originalUrl={item.originalUrl}
            metrics={item.metrics}
            actions={item.actions.filter((action) => action.kind !== 'open')}
            onAction={(action) => onAction(item, action)}
          />
        </ItemMeta>
      </div>

      {isSeen && (
        <span className="card-seen-marker">
          <Check size={10} weight="bold" aria-hidden="true" />
          已看过
        </span>
      )}

      <ItemLightbox preview={preview} onClose={() => setPreview(undefined)} />
    </article>
  );
}
