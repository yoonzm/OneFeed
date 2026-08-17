import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { FeedBlock } from '../../types/feed';
import { BlockRenderer } from './BlockRenderer';

function render(block: FeedBlock, compactGallery = false): string {
  return renderToStaticMarkup(
    <BlockRenderer
      block={block}
      expanded={false}
      onPreview={vi.fn()}
      compactGallery={compactGallery}
    />,
  );
}

describe('BlockRenderer', () => {
  it('renders structured rich text and gallery blocks', () => {
    const text = render({
      type: 'richText',
      html: '<p>结构化正文</p>',
      plainText: '结构化正文',
    });
    const gallery = render({
      type: 'gallery',
      items: [{ url: 'https://example.com/image.jpg', alt: '示例图片' }],
    });

    expect(text).toContain('class="content"');
    expect(text).not.toContain('content-expanded');
    expect(text).toContain('<p>结构化正文</p>');
    expect(gallery).toContain('aria-label="预览图片 1"');
    expect(gallery).toContain('alt="示例图片"');
  });

  it('limits compact galleries to four cells and exposes the remaining count', () => {
    const gallery = render({
      type: 'gallery',
      items: Array.from({ length: 6 }, (_, index) => ({
        url: `https://example.com/image-${index + 1}.jpg`,
        alt: `示例图片 ${index + 1}`,
        width: 1200,
        height: 800,
      })),
    }, true);

    expect(gallery).toContain('media-count-4');
    expect(gallery.match(/<button/g) ?? []).toHaveLength(4);
    expect(gallery).toContain('aria-label="预览图片 4，共 6 张"');
    expect(gallery).toContain('class="media-overflow-count"');
    expect(gallery).toContain('>+2</span>');
    expect(gallery).toContain('width="1200"');
    expect(gallery).toContain('height="800"');
    expect(gallery).not.toContain('image-5.jpg');
  });

  it('renders link, quote and poll blocks without platform branches', () => {
    const link = render({
      type: 'linkPreview',
      preview: { url: 'https://example.com/', title: '示例链接' },
    });
    const quote = render({
      type: 'quote',
      item: {
        id: 'quoted',
        originalUrl: 'https://example.com/quoted',
        author: { name: '引用作者', avatar: '' },
        text: '引用内容',
      },
    });
    const poll = render({
      type: 'poll',
      poll: { options: [{ id: 'yes', label: '支持', votes: 8 }], totalVotes: 8 },
    });

    expect(link).toContain('示例链接');
    expect(quote).toContain('引用内容');
    expect(poll).toContain('支持');
    expect(poll).toContain('共 8 票');
  });
});
