import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { FeedItem } from '../../../types/feed';
import { Card } from './Card';

const shortReply: FeedItem = {
  id: 'v2ex_reply_1',
  platform: 'v2ex',
  source: { id: 'v2ex', name: 'V2EX' },
  originalUrl: 'https://www.v2ex.com/t/1#r_1',
  kind: 'post',
  role: 'reply',
  author: { name: 'Alice', avatar: '' },
  previewBlocks: [{
    type: 'richText',
    html: '<p>谢谢</p>',
    plainText: '谢谢',
  }],
  metrics: [],
  actions: [],
};

describe('Card', () => {
  it('renders short plain text as a compact card without the author row', () => {
    const markup = renderToStaticMarkup(
      <Card item={shortReply} index={0} onAction={vi.fn()} />,
    );

    expect(markup).toContain('feed-card-compact');
    expect(markup).toContain('class="content content-expanded"');
    expect(markup).not.toContain('author-row');
    expect(markup).not.toContain('Alice');
    expect(markup).not.toContain('展开全文');
  });

  it('keeps contextual short text compact', () => {
    const markup = renderToStaticMarkup(
      <Card
        item={{
          ...shortReply,
          context: { community: { name: '分享创造' } },
        }}
        index={0}
        onAction={vi.fn()}
      />,
    );

    expect(markup).toContain('feed-card-compact');
  });

  it('renders a short title without body blocks as a compact card', () => {
    const markup = renderToStaticMarkup(
      <Card
        item={{
          ...shortReply,
          title: '问',
          previewBlocks: [],
          context: { community: { name: '分享创造' } },
          actions: [{
            id: 'open',
            kind: 'open',
            label: '查看原文',
            enabled: true,
          }],
        }}
        index={0}
        onAction={vi.fn()}
      />,
    );

    expect(markup).toContain('feed-card-compact');
    expect(markup).toContain('>问</a>');
    expect(markup).not.toContain('查看原文');
  });

  it('keeps long text in the comfortable card layout', () => {
    const plainText = '这是一段需要保留完整阅读节奏的较长内容，用于确认通用列表不会把所有纯文本条目都压缩成行内布局。';
    const markup = renderToStaticMarkup(
      <Card
        item={{
          ...shortReply,
          previewBlocks: [{
            type: 'richText',
            html: `<p>${plainText}</p>`,
            plainText,
          }],
        }}
        index={0}
        onAction={vi.fn()}
      />,
    );

    expect(markup).not.toContain('feed-card-compact');
  });
});
