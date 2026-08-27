import { Check } from '@phosphor-icons/react';
import { useState } from 'react';
import type {
  FeedActionDescriptor,
  FeedBlock,
  FeedImage,
  FeedItem,
} from '../../../types/feed';
import { i18n } from '../../../i18n';
import { ActionBar } from '../../components/ActionBar';
import { BlockRenderer } from '../../components/BlockRenderer';
import {
  ItemBody,
  ItemLightbox,
  ItemMeta,
  ItemTitle,
} from './ContentItemParts';
import { getDensityClassName } from './contentItemUtils';

interface FeedCardProps {
  item: FeedItem;
  index: number;
  isSeen?: boolean;
  onSeen?: () => void;
  onAction: (item: FeedItem, action: FeedActionDescriptor) => void;
}

type FeedMediaBlock = Extract<FeedBlock, { type: 'gallery' | 'video' | 'linkPreview' }>;

/** 带图外链属于整条内容的视觉摘要，优先于链接卡内部的缩略图。 */
function getSideMedia(item: FeedItem): FeedMediaBlock | undefined {
  const linkPreview = item.previewBlocks.find(
    (block): block is Extract<FeedBlock, { type: 'linkPreview' }> => (
      block.type === 'linkPreview' && Boolean(block.preview.image)
    ),
  );
  if (linkPreview) return linkPreview;

  for (const block of item.previewBlocks) {
    if (block.type === 'gallery') {
      const image = block.items[0];
      if (image) return { type: 'gallery', items: [image] };
    }

    if (block.type === 'video' && (block.media.url || block.media.poster)) {
      return block;
    }
  }

  return undefined;
}

/** Feed 专用卡片：负责预览截断、详情导航、已读状态和 Feed 媒体布局。 */
export function FeedCard({
  item,
  index,
  isSeen = false,
  onSeen,
  onAction,
}: FeedCardProps) {
  const [preview, setPreview] = useState<FeedImage>();
  const densityClassName = getDensityClassName(item, item.previewBlocks);
  const sideMedia = getSideMedia(item);
  const contentBlocks = item.previewBlocks.filter(
    (block) => block.type !== 'gallery' && block.type !== 'video',
  );
  const hasLinkPreviewMedia = sideMedia?.type === 'linkPreview';

  return (
    <article
      className={`item-card feed-card feed-card-${item.kind} feed-card-${item.role} ${item.title ? 'item-card-titled' : 'item-card-untitled'} ${sideMedia ? 'feed-card-side-media' : ''} ${hasLinkPreviewMedia ? 'feed-card-link-preview-media' : ''} ${densityClassName} ${isSeen ? 'feed-card-seen' : ''}`.trim()}
      data-seen={isSeen ? 'true' : undefined}
    >
      <div className="card-main">
        <ItemTitle item={item} linked onOpen={onSeen} />
        <ItemBody blocks={contentBlocks} expanded={false} onPreview={setPreview} />

        {sideMedia && (
          <div className="card-media-aside">
            {sideMedia.type === 'linkPreview' && sideMedia.preview.image ? (
              <a
                className="link-preview-media"
                href={sideMedia.preview.url}
                target="_blank"
                rel="noreferrer"
                aria-label={sideMedia.preview.title || sideMedia.preview.url}
                onClick={onSeen}
              >
                <img
                  src={sideMedia.preview.image}
                  alt=""
                  loading="lazy"
                />
              </a>
            ) : (
              <BlockRenderer
                block={sideMedia}
                expanded={false}
                onPreview={setPreview}
                compactGallery
              />
            )}
          </div>
        )}

        <ItemMeta
          item={item}
          index={index}
          afterTime={!item.title ? (
            <a
              className="card-detail-link"
              href={item.originalUrl}
              target="_blank"
              rel="noreferrer"
              onClick={onSeen}
            >
              {i18n.t('reader.viewDetails')}
            </a>
          ) : undefined}
        >
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
          {i18n.t('reader.seen')}
        </span>
      )}

      <ItemLightbox preview={preview} onClose={() => setPreview(undefined)} />
    </article>
  );
}
