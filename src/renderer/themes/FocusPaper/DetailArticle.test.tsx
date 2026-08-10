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
  title: '如何保持专注？',
  body: [{
    type: 'richText',
    html: '<p>超过列表摘要长度的完整正文。</p>',
    plainText: '超过列表摘要长度的完整正文。',
  }],
  metrics: [],
  actions: [],
};

describe('DetailArticle', () => {
  it('renders the detail body as expanded content', () => {
    const markup = renderToStaticMarkup(
      <DetailArticle content={content} onAction={vi.fn()} />,
    );

    expect(markup).toContain('<h1>如何保持专注？</h1>');
    expect(markup).toContain('content content-expanded');
    expect(markup).toContain('超过列表摘要长度的完整正文。');
    expect(markup).not.toContain('展开全文');
  });
});
