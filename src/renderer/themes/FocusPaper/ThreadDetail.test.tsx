import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { ThreadDetail as ThreadDetailContent } from '../../../types/detail';
import { ThreadDetail } from './ThreadDetail';

const content: ThreadDetailContent = {
  id: 'zhihu_question_1',
  platform: 'zhihu',
  source: { id: 'zhihu', name: '知乎' },
  originalUrl: 'https://www.zhihu.com/question/1',
  kind: 'thread',
  header: {
    id: 'zhihu_question_1',
    role: 'question',
    originalUrl: 'https://www.zhihu.com/question/1',
    title: '如何保持专注？',
    author: { name: '提问者', avatar: '' },
    publishedAt: '2026-08-12T09:00:00+08:00',
    body: [{ type: 'richText', html: '<p>问题补充。</p>', plainText: '问题补充。' }],
    metrics: [
      { kind: 'reactions', value: 8, label: '赞同' },
      { kind: 'replies', value: 12, label: '回答' },
    ],
    actions: [
      { id: 'react', kind: 'react', label: '赞同', enabled: true },
      { id: 'open', kind: 'open', label: '查看原问题', enabled: true },
    ],
  },
  entries: [{
    id: 'zhihu_42',
    platform: 'zhihu',
    source: { id: 'zhihu', name: '知乎' },
    originalUrl: 'https://www.zhihu.com/question/1/answer/42',
    kind: 'article',
    role: 'answer',
    author: { name: '林一', avatar: '' },
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
    metrics: [],
    actions: [{ id: 'open', kind: 'open', label: '查看回答', enabled: true }],
  }],
  entryLabel: '回答',
  loadingMode: 'infinite',
};

describe('ThreadDetail', () => {
  it('renders one thread header and independently collapsible entries', () => {
    const markup = renderToStaticMarkup(
      <ThreadDetail content={content} onAction={vi.fn()} />,
    );

    expect(markup.match(/如何保持专注？/g)).toHaveLength(1);
    expect(markup).toContain('问题补充。');
    expect(markup).toContain('12 条');
    expect(markup).toContain('avatar-fallback');
    expect(markup).toContain('<time>');
    expect(markup).not.toContain(content.source.name);
    expect(markup).toContain('展开全文');
    expect(markup).toContain('thread-entry');
    expect(markup).not.toContain('feed-card');
    expect(markup).not.toContain('feed-card-side-media');
    expect(markup).not.toContain('https://example.com/answer.jpg');
    expect(markup).not.toContain('查看详情');
    expect(markup).not.toContain('查看原问题');
    expect(markup).not.toContain('>赞同');
    expect(markup).not.toContain('查看回答');
  });
});
