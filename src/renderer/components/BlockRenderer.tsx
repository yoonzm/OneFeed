import { useMemo, type ComponentType } from 'react';
import { formatNumber, i18n } from '../../i18n';
import type { FeedBlock, FeedImage } from '../../types/feed';

interface BlockComponentProps {
  block: FeedBlock;
  expanded: boolean;
  onPreview: (image: FeedImage) => void;
  compactGallery?: boolean;
  hideImages?: boolean;
  showHiddenImageLinks?: boolean;
}

const imageLinkClassName = 'text-[var(--blue)] underline underline-offset-3';

function HiddenImageLink({ image, onPreview }: {
  image: FeedImage;
  onPreview: (image: FeedImage) => void;
}) {
  return (
    <a className={imageLinkClassName} href={image.url} onClick={(event) => {
      event.preventDefault();
      event.stopPropagation();
      onPreview(image);
    }}>
      {i18n.t('block.image')}
    </a>
  );
}

function RichTextBlock({ block, expanded, hideImages, showHiddenImageLinks, onPreview }: BlockComponentProps) {
  const html = block.type === 'richText' ? block.html : '';
  const imageLabel = i18n.t('block.image');
  const hiddenContent = useMemo(() => {
    if (!hideImages || !showHiddenImageLinks) return { html, images: [] };
    // 在惰性模板内替换图片，避免隐藏模式先挂载图片并触发资源加载。
    const template = document.createElement('template');
    template.innerHTML = html;
    const images: FeedImage[] = [];
    template.content.querySelectorAll<HTMLImageElement>('img:not([data-onefeed-kind="emoji"])').forEach((image) => {
      const url = image.getAttribute('src');
      if (!url) return;
      const link = document.createElement('a');
      link.href = url;
      link.className = imageLinkClassName;
      link.textContent = imageLabel;
      link.dataset.hiddenImageIndex = String(images.length);
      images.push({ url, alt: image.alt });
      // 原站图片可能已有链接；先解包以免生成嵌套 a 标签。
      const parentLink = image.closest('a');
      if (parentLink) parentLink.replaceWith(...parentLink.childNodes);
      image.replaceWith(link);
    });
    return { html: template.innerHTML, images };
  }, [html, hideImages, showHiddenImageLinks, imageLabel]);
  if (block.type !== 'richText') return null;

  // FeedBlock 契约要求 Adapter 先清洗 html；Renderer 只负责保持富文本结构。
  return (
    <div
      className={`${expanded ? 'content content-expanded' : 'content'}${
        hideImages ? ' content-images-hidden' : ''
      }`}
      onClick={(event) => {
        const link = (event.target as Element).closest<HTMLAnchorElement>('a[data-hidden-image-index]');
        const image = link && hiddenContent.images[Number(link.dataset.hiddenImageIndex)];
        if (!image) return;
        event.preventDefault();
        event.stopPropagation();
        onPreview(image);
      }}
      dangerouslySetInnerHTML={{ __html: hiddenContent.html }}
    />
  );
}

function GalleryBlock({ block, onPreview, compactGallery = false, hideImages, showHiddenImageLinks }: BlockComponentProps) {
  if (block.type !== 'gallery') return null;
  if (hideImages) return showHiddenImageLinks ? (
    <div className="flex flex-wrap gap-x-3 gap-y-1">
      {block.items.map((image, index) => (
        <HiddenImageLink image={image} onPreview={onPreview} key={`${image.url}-${index}`} />
      ))}
    </div>
  ) : null;

  const visibleItems = compactGallery ? block.items.slice(0, 4) : block.items;
  const remainingCount = compactGallery ? block.items.length - visibleItems.length : 0;
  const layoutCount = compactGallery
    ? Math.min(visibleItems.length, 4)
    : Math.min(visibleItems.length, 3);

  return (
    <div className={`media-grid media-count-${layoutCount}`}>
      {/* 限制单卡资源数量，防止异常页面一次挂载过多图片节点。 */}
      {visibleItems.map((image, index) => (
        <button
          className="media-button"
          type="button"
          key={`${image.url}-${index}`}
          onClick={() => onPreview(image)}
          aria-label={remainingCount > 0 && index === visibleItems.length - 1
            ? i18n.t('block.previewImageInGallery', [
              String(index + 1),
              formatNumber(block.items.length),
            ])
            : i18n.t('block.previewImage', [String(index + 1)])}
        >
          <img
            src={image.url}
            alt={image.alt}
            width={image.width}
            height={image.height}
            loading="lazy"
          />
          {remainingCount > 0 && index === visibleItems.length - 1 && (
            <span className="media-overflow-count" aria-hidden="true">+{remainingCount}</span>
          )}
        </button>
      ))}
    </div>
  );
}

function VideoBlock({ block, hideImages, showHiddenImageLinks, onPreview }: BlockComponentProps) {
  if (block.type !== 'video') return null;

  if (!block.media.url) {
    if (block.media.poster && hideImages && showHiddenImageLinks) {
      return <HiddenImageLink image={{ url: block.media.poster, alt: block.media.alt || '' }} onPreview={onPreview} />;
    }
    return block.media.poster && !hideImages ? (
      <img
        className="video-poster"
        src={block.media.poster}
        alt={block.media.alt || i18n.t('block.videoPoster')}
        loading="lazy"
      />
    ) : null;
  }

  return (
    <video
      className="video-player"
      controls
      preload="metadata"
      poster={!hideImages && block.media.poster ? block.media.poster : undefined}
      src={block.media.url}
    >
      {i18n.t('block.videoUnsupported')}
    </video>
  );
}

function LinkPreviewBlock({ block, hideImages, showHiddenImageLinks, onPreview }: BlockComponentProps) {
  if (block.type !== 'linkPreview') return null;

  return (
    <>
      <a className="link-preview" href={block.preview.url} target="_blank" rel="noreferrer">
        {block.preview.image && !hideImages && (
          <img src={block.preview.image} alt="" loading="lazy" />
        )}
        <span>
          {block.preview.siteName && <small>{block.preview.siteName}</small>}
          <strong>{block.preview.title || block.preview.url}</strong>
          {block.preview.description && <p>{block.preview.description}</p>}
        </span>
      </a>
      {block.preview.image && hideImages && showHiddenImageLinks && (
        <HiddenImageLink image={{ url: block.preview.image, alt: block.preview.title || '' }} onPreview={onPreview} />
      )}
    </>
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
    <section className="poll-block" aria-label={block.poll.question || i18n.t('block.poll')}>
      {block.poll.question && <strong>{block.poll.question}</strong>}
      <ul>
        {block.poll.options.map((option) => (
          <li key={option.id}>
            <span>{option.label}</span>
            {option.votes !== undefined && (
              <small>{i18n.t(
                'block.voteCount',
                option.votes,
                [formatNumber(option.votes)],
              )}</small>
            )}
          </li>
        ))}
      </ul>
      {block.poll.totalVotes !== undefined && (
        <small>{i18n.t(
          'block.totalVotes',
          block.poll.totalVotes,
          [formatNumber(block.poll.totalVotes)],
        )}</small>
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

export function BlockRenderer({
  block,
  expanded,
  onPreview,
  compactGallery,
  hideImages,
  showHiddenImageLinks,
}: BlockRendererProps) {
  // 注册表让新增标准 Block 保持集中且穷尽，避免在主题组件中加入平台判断。
  const Renderer = blockRegistry[block.type];
  return (
    <Renderer
      block={block}
      expanded={expanded}
      onPreview={onPreview}
      compactGallery={compactGallery}
      hideImages={hideImages}
      showHiddenImageLinks={showHiddenImageLinks}
    />
  );
}
