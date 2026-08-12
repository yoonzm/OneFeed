import type { ComponentType } from 'react';
import type { FeedBlock, FeedImage } from '../../types/feed';

interface BlockComponentProps {
  block: FeedBlock;
  expanded: boolean;
  onPreview: (image: FeedImage) => void;
}

function RichTextBlock({ block, expanded }: BlockComponentProps) {
  if (block.type !== 'richText') return null;

  // FeedBlock 契约要求 Adapter 先清洗 html；Renderer 只负责保持富文本结构。
  return (
    <div
      className={`content ${expanded ? 'content-expanded' : ''}`}
      dangerouslySetInnerHTML={{ __html: block.html }}
    />
  );
}

function GalleryBlock({ block, onPreview }: BlockComponentProps) {
  if (block.type !== 'gallery') return null;

  return (
    <div className={`media-grid media-count-${Math.min(block.items.length, 3)}`}>
      {/* 限制单卡资源数量，防止异常页面一次挂载过多图片节点。 */}
      {block.items.slice(0, 6).map((image, index) => (
        <button
          className="media-button"
          type="button"
          key={`${image.url}-${index}`}
          onClick={() => onPreview(image)}
          aria-label={`预览图片 ${index + 1}`}
        >
          <img src={image.url} alt={image.alt} loading="lazy" />
        </button>
      ))}
    </div>
  );
}

function VideoBlock({ block }: BlockComponentProps) {
  if (block.type !== 'video') return null;

  if (!block.media.url) {
    return block.media.poster ? (
      <img
        className="video-poster"
        src={block.media.poster}
        alt={block.media.alt || '视频封面'}
        loading="lazy"
      />
    ) : null;
  }

  return (
    <video
      className="video-player"
      controls
      preload="metadata"
      poster={block.media.poster || undefined}
      src={block.media.url}
    >
      当前浏览器无法播放此视频。
    </video>
  );
}

function LinkPreviewBlock({ block }: BlockComponentProps) {
  if (block.type !== 'linkPreview') return null;

  return (
    <a className="link-preview" href={block.preview.url} target="_blank" rel="noreferrer">
      {block.preview.image && <img src={block.preview.image} alt="" loading="lazy" />}
      <span>
        {block.preview.siteName && <small>{block.preview.siteName}</small>}
        <strong>{block.preview.title || block.preview.url}</strong>
        {block.preview.description && <p>{block.preview.description}</p>}
      </span>
    </a>
  );
}

function QuoteBlock({ block }: BlockComponentProps) {
  if (block.type !== 'quote') return null;

  return (
    <a className="quote-block" href={block.item.originalUrl} target="_blank" rel="noreferrer">
      <strong>{block.item.author.name}</strong>
      {block.item.title && <b>{block.item.title}</b>}
      {block.item.text && <p>{block.item.text}</p>}
    </a>
  );
}

function PollBlock({ block }: BlockComponentProps) {
  if (block.type !== 'poll') return null;

  return (
    <section className="poll-block" aria-label={block.poll.question || '投票'}>
      {block.poll.question && <strong>{block.poll.question}</strong>}
      <ul>
        {block.poll.options.map((option) => (
          <li key={option.id}>
            <span>{option.label}</span>
            {option.votes !== undefined && <small>{option.votes.toLocaleString('zh-CN')} 票</small>}
          </li>
        ))}
      </ul>
      {block.poll.totalVotes !== undefined && (
        <small>共 {block.poll.totalVotes.toLocaleString('zh-CN')} 票</small>
      )}
    </section>
  );
}

const blockRegistry: Record<FeedBlock['type'], ComponentType<BlockComponentProps>> = {
  richText: RichTextBlock,
  gallery: GalleryBlock,
  video: VideoBlock,
  linkPreview: LinkPreviewBlock,
  quote: QuoteBlock,
  poll: PollBlock,
};

interface BlockRendererProps extends Omit<BlockComponentProps, 'block'> {
  block: FeedBlock;
}

export function BlockRenderer({ block, expanded, onPreview }: BlockRendererProps) {
  // 注册表让新增标准 Block 保持集中且穷尽，避免在主题组件中加入平台判断。
  const Renderer = blockRegistry[block.type];
  return <Renderer block={block} expanded={expanded} onPreview={onPreview} />;
}
