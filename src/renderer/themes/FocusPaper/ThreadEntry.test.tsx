import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ThreadEntry as ThreadEntryItem } from '../../../types/feed';
import { ThreadEntry } from './ThreadEntry';

const shortReply: ThreadEntryItem = {
  id: 'v2ex_reply_1',
  platform: 'v2ex',
  source: { id: 'v2ex', name: 'V2EX' },
  originalUrl: 'https://www.v2ex.com/t/1#r_1',
  kind: 'post',
  role: 'reply',
  author: { name: 'Alice', avatar: '' },
  body: [{
    type: 'richText',
    html: '<p>谢谢</p>',
    plainText: '谢谢',
  }],
  metrics: [],
  actions: [],
};

describe('ThreadEntry', () => {
  let root: Root | undefined;

  afterEach(async () => {
    if (root) await act(async () => root?.unmount());
    root = undefined;
  });

  it('renders a short reply as complete Thread content without Feed navigation', () => {
    const plainText = '这条回复超过常见的两行预览高度，但仍然应该在讨论详情中直接完整展示。'.repeat(2);
    const markup = renderToStaticMarkup(
      <ThreadEntry
        item={{
          ...shortReply,
          title: '回复标题',
          body: [{ type: 'richText', html: `<p>${plainText}</p>`, plainText }],
          actions: [{ id: 'open', kind: 'open', label: '查看原帖', enabled: true }],
        }}
        index={0}
        onAction={vi.fn()}
      />,
    );

    expect(markup).toContain('thread-entry');
    expect(markup).not.toContain('feed-card');
    expect(markup).toContain('content-expanded');
    expect(markup).not.toContain('展开全文');
    expect(markup).not.toContain('查看详情');
    expect(markup).not.toContain('查看原帖');
    expect(markup).not.toContain(`href="${shortReply.originalUrl}"`);
  });

  it('keeps Thread media in the body instead of the Feed side-media region', () => {
    const markup = renderToStaticMarkup(
      <ThreadEntry
        item={{
          ...shortReply,
          body: [
            ...shortReply.body,
            {
              type: 'gallery',
              items: [{ url: 'https://example.com/reply.jpg', alt: '回复配图' }],
            },
          ],
        }}
        index={0}
        onAction={vi.fn()}
      />,
    );

    expect(markup).not.toContain('feed-card-side-media');
    expect(markup).not.toContain('card-media-aside');
    expect(markup).toContain('src="https://example.com/reply.jpg"');
  });

  it('keeps a long answer as a two-line preview linked to its detail page', () => {
    const markup = renderToStaticMarkup(
      <ThreadEntry
        item={{
          ...shortReply,
          kind: 'article',
          role: 'answer',
          originalUrl: 'https://www.zhihu.com/question/1/answer/42',
          body: [
            {
              type: 'richText',
              html: `<p>${'长回答。'.repeat(100)}</p>`,
              plainText: '长回答。'.repeat(100),
            },
            {
              type: 'gallery',
              items: [{ url: 'https://example.com/answer.jpg', alt: '回答配图' }],
            },
          ],
          actions: [{ id: 'open', kind: 'open', label: '查看详情', enabled: true }],
        }}
        index={0}
        onAction={vi.fn()}
      />,
    );

    expect(markup).not.toContain('content-expanded');
    expect(markup).not.toContain('https://example.com/answer.jpg');
    expect(markup).not.toContain('展开全文');
    expect(markup).toContain('thread-answer-detail-link');
    expect(markup).toContain('查看详情');
    expect(markup).not.toContain('查看回答');
    expect(markup).toContain('href="https://www.zhihu.com/question/1/answer/42"');
  });

  it('expands a long reply in place without adding a detail link', async () => {
    const container = document.createElement('div');
    root = createRoot(container);

    await act(async () => root?.render(
      <ThreadEntry
        item={{
          ...shortReply,
          body: [
            {
              type: 'richText',
              html: `<p>${'长回复。'.repeat(100)}</p>`,
              plainText: '长回复。'.repeat(100),
            },
            {
              type: 'gallery',
              items: [{ url: 'https://example.com/reply.jpg', alt: '回复配图' }],
            },
          ],
        }}
        index={0}
        onAction={vi.fn()}
      />,
    ));

    expect(container.querySelector('.card-media-aside')).toBeNull();
    expect(container.querySelector('img[src="https://example.com/reply.jpg"]')).toBeNull();
    expect(container.querySelector('.card-detail-link')).toBeNull();

    const expand = Array.from(container.querySelectorAll('button'))
      .find((button) => button.textContent === '展开全文');
    await act(async () => expand?.click());

    expect(container.querySelector('img[src="https://example.com/reply.jpg"]')).not.toBeNull();
    const preview = container.querySelector<HTMLButtonElement>('.media-button');
    await act(async () => preview?.click());
    expect(container.querySelector('.lightbox img[src="https://example.com/reply.jpg"]'))
      .not.toBeNull();
  });
});
