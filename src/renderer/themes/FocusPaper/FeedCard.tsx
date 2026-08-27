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

type FeedMediaBlock = Extract<FeedBlock, { type: 'gallery' | 'video' }>;

/** Feed 只保留首个有效内容媒体，并将图库收敛为单图右侧预览。 */
function getSideMedia(item: FeedItem): FeedMediaBlock | undefined {
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

  return (
    <article
      className={`item-card feed-card feed-card-${item.kind} feed-card-${item.role} ${item.title ? 'item-card-titled' : 'item-card-untitled'} ${sideMedia ? 'feed-card-side-media' : ''} ${densityClassName} ${isSeen ? 'feed-card-seen' : ''}`.trim()}
      data-seen={isSeen ? 'true' : undefined}
    >
      <div className="card-main">
        <ItemTitle item={item} linked onOpen={onSeen} />
        <ItemBody blocks={contentBlocks} expanded={false} onPreview={setPreview} />

        {sideMedia && (
          <div className="card-media-aside">
            <BlockRenderer
              block={sideMedia}
              expanded={false}
              onPreview={setPreview}
              compactGallery
            />
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
