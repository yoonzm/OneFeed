import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { ArticleDetail } from '../../../types/detail';
import { DetailArticle } from './DetailArticle';

const content: ArticleDetail = {
  id: 'zhihu_42',
  platform: 'zhihu',
  source: { id: 'zhihu', name: '知乎' },
  originalUrl: 'https://www.zhihu.com/question/1/answer/42',
  kind: 'article',
  role: 'answer',
  author: { name: '林一', avatar: '' },
  publishedAt: '2026-08-12T09:00:00+08:00',
  title: '如何保持专注？',
  body: [{
    type: 'richText',
    html: '<p>超过列表摘要长度的完整正文。</p>',
    plainText: '超过列表摘要长度的完整正文。',
  }],
  metrics: [
    { kind: 'reactions', value: 8, label: '赞同' },
    { kind: 'replies', value: 3, label: '评论' },
  ],
  actions: [
    { id: 'react', kind: 'react', label: '赞同', enabled: true },
    { id: 'reply', kind: 'reply', label: '评论', enabled: true },
    { id: 'open', kind: 'open', label: '查看原文', enabled: true },
  ],
};

describe('DetailArticle', () => {
  it('renders the detail body as expanded content', () => {
    const markup = renderToStaticMarkup(
      <DetailArticle content={content} onAction={vi.fn()} />,
    );

    expect(markup).toContain('<h1>如何保持专注？</h1>');
    expect(markup).toContain('content content-expanded');
    expect(markup).toContain('超过列表摘要长度的完整正文。');
    expect(markup).toContain('avatar-fallback');
    expect(markup).toContain('<time>');
    expect(markup).not.toContain(content.source.name);
    expect(markup).not.toContain('展开全文');
    expect(markup).not.toContain('赞同');
    expect(markup).not.toContain('评论');
    expect(markup).not.toContain('查看原文');
  });
});
