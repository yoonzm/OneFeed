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
  it('renders short content without the collapsed fade', () => {
    const markup = renderToStaticMarkup(
      <Card item={shortReply} index={0} onAction={vi.fn()} />,
    );

    expect(markup).toContain('class="content content-expanded"');
    expect(markup).not.toContain('展开全文');
  });
});
