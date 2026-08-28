import { useState } from 'react';
import type {
  FeedActionDescriptor,
  FeedImage,
  ThreadEntry as ThreadEntryItem,
} from '../../../types/feed';
import { i18n } from '../../../i18n';
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
  hideImages?: boolean;
  onAction: (item: ThreadEntryItem, action: FeedActionDescriptor) => void;
}

/** Answer 是详情预览，Reply 是线程内正文；二者共享骨架但不共享展开和导航语义。 */
export function ThreadEntry({ item, index, hideImages = false, onAction }: ThreadEntryProps) {
  const [expanded, setExpanded] = useState(false);
  const [preview, setPreview] = useState<FeedImage>();
  const isAnswer = item.role === 'answer';
  const expandable = item.role === 'reply' && hasExpandableText(item.body);
  const contentExpanded = !isAnswer && (!expandable || expanded);
  // 回答列表只承担导读，因此隐藏媒体和其他完整内容块；回复则留在线程内原地阅读。
  const contentBlocks = isAnswer
    ? item.body.filter((block) => block.type === 'richText').slice(0, 1)
    : item.body.filter((block) => !(!contentExpanded && block.type === 'gallery'));
  const openAction = item.actions.find((action) => action.kind === 'open');
  const densityClassName = getDensityClassName(item, item.body);

  return (
    <article
      className={`item-card thread-entry thread-entry-${item.kind} thread-entry-${item.role} ${item.title ? 'item-card-titled' : 'item-card-untitled'} ${densityClassName}`.trim()}
    >
      <div className="card-main">
        <ItemTitle item={item} />
        <ItemBody
          blocks={contentBlocks}
          expanded={contentExpanded}
          hideImages={hideImages}
          onPreview={setPreview}
        />

        <ItemMeta
          item={item}
          index={index}
          afterTime={isAnswer ? (
            <a
              className="card-detail-link"
              href={item.originalUrl}
              target="_blank"
              rel="noreferrer"
            >
              {openAction?.label || i18n.t('reader.viewDetails')}
            </a>
          ) : undefined}
        >
          {expandable && (
            <button
              className="text-action"
              type="button"
              aria-expanded={expanded}
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? i18n.t('reader.collapse') : i18n.t('reader.expandFull')}
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

      <ItemLightbox
        preview={hideImages ? undefined : preview}
        onClose={() => setPreview(undefined)}
      />
    </article>
  );
}
