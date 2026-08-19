import { useState } from 'react';
import type {
  FeedActionDescriptor,
  FeedImage,
  ThreadEntry as ThreadEntryItem,
} from '../../../types/feed';
import { ActionBar } from '../../components/ActionBar';
import {
  ItemBody,
  ItemLightbox,
  ItemMeta,
  ItemTitle,
} from './ContentItemParts';
import { getDensityClassName, hasExpandableText } from './contentItemUtils';

interface ThreadEntryProps {
  item: ThreadEntryItem;
  index: number;
  onAction: (item: ThreadEntryItem, action: FeedActionDescriptor) => void;
}

/** Thread 条目负责正文阅读与讨论内操作，不携带 Feed 的已读和详情导航语义。 */
export function ThreadEntry({ item, index, onAction }: ThreadEntryProps) {
  const [expanded, setExpanded] = useState(false);
  const [preview, setPreview] = useState<FeedImage>();
  const expandable = hasExpandableText(item.body);
  // 短回复直接完整展示；长回答才提供独立折叠，避免详情正文被 Feed 两行预览永久截断。
  const contentExpanded = !expandable || expanded;
  const contentBlocks = item.body.filter(
    (block) => !(!contentExpanded && block.type === 'gallery'),
  );
  const densityClassName = getDensityClassName(item, item.body);

  return (
    <article
      className={`item-card thread-entry thread-entry-${item.kind} thread-entry-${item.role} ${item.title ? 'item-card-titled' : 'item-card-untitled'} ${densityClassName}`.trim()}
    >
      <div className="card-main">
        <ItemTitle item={item} />
        <ItemBody blocks={contentBlocks} expanded={contentExpanded} onPreview={setPreview} />

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

          <ActionBar
            originalUrl={item.originalUrl}
            metrics={item.metrics}
            actions={item.actions.filter((action) => action.kind !== 'open')}
            onAction={(action) => onAction(item, action)}
          />
        </ItemMeta>
      </div>

      <ItemLightbox preview={preview} onClose={() => setPreview(undefined)} />
    </article>
  );
}
