import type { ReactNode } from 'react';
import type {
  ContentItemBase,
  FeedBlock,
  FeedImage,
} from '../../../types/feed';
import { BlockRenderer } from '../../components/BlockRenderer';

interface ItemTitleProps {
  item: Pick<ContentItemBase, 'originalUrl' | 'title'>;
  linked?: boolean;
  onOpen?: () => void;
}

interface ItemBodyProps {
  blocks: readonly FeedBlock[];
  expanded: boolean;
  onPreview: (image: FeedImage) => void;
}

interface ItemMetaProps {
  item: ContentItemBase;
  index: number;
  children?: ReactNode;
}

interface ItemLightboxProps {
  preview?: FeedImage;
  onClose: () => void;
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

export function ItemTitle({ item, linked = false, onOpen }: ItemTitleProps) {
  if (!item.title) return null;

  return (
    <div className="card-title-row">
      <h2>
        {linked ? (
          <a href={item.originalUrl} target="_blank" rel="noreferrer" onClick={onOpen}>
            {item.title}
          </a>
        ) : item.title}
      </h2>
    </div>
  );
}

export function ItemBody({ blocks, expanded, onPreview }: ItemBodyProps) {
  if (!blocks.length) return null;

  return (
    <div className="card-body-row block-stack">
      {blocks.map((block, blockIndex) => (
        <BlockRenderer
          block={block}
          expanded={expanded}
          onPreview={onPreview}
          compactGallery
          key={`${block.type}-${blockIndex}`}
        />
      ))}
    </div>
  );
}

/** 两个列表 Surface 共用内容元信息，但把各自的导航和操作作为 children 注入。 */
export function ItemMeta({ item, index, children }: ItemMetaProps) {
  const hasAuthor = Boolean(item.author.name.trim());
  const authorAvatar = item.author.avatar ? (
    <img className="card-author-avatar" src={item.author.avatar} alt="" loading="lazy" />
  ) : null;

  return (
    <div className="card-meta-row">
      <span className="card-index" aria-label={`第 ${item.sequence || index + 1} 条`}>
        {String(item.sequence || index + 1).padStart(2, '0')}
      </span>
      {hasAuthor && (
        item.author.link ? (
          <a className="card-author" href={item.author.link} target="_blank" rel="noreferrer">
            {authorAvatar}
            {item.author.name}
          </a>
        ) : (
          <span className="card-author">
            {authorAvatar}
            {item.author.name}
          </span>
        )
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

      {children}
    </div>
  );
}

export function ItemLightbox({ preview, onClose }: ItemLightboxProps) {
  if (!preview) return null;

  return (
    <button className="lightbox" type="button" onClick={onClose} aria-label="关闭图片预览">
      <img src={preview.url} alt={preview.alt || '预览图片'} />
      <span>点击任意位置关闭</span>
    </button>
  );
}
