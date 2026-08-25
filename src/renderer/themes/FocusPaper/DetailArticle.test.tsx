import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { ArticleDetail } from '../../../types/detail';
import { DetailArticle } from './DetailArticle';

const readerStyles = readFileSync(resolve('src/renderer/styles.css'), 'utf8');

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
  context: {
    body: [{
      type: 'richText',
      html: '<p>先明确真正要解决的问题。</p>',
      plainText: '先明确真正要解决的问题。',
    }],
    navigation: {
      label: '查看全部 12 个回答',
      url: 'https://www.zhihu.com/question/1',
    },
  },
  body: [{
    type: 'richText',
    html: '<p>超过列表摘要长度的完整正文。</p>',
    plainText: '超过列表摘要长度的完整正文。',
  }],
  actionSlots: {
    author: {
      metrics: [
        { kind: 'reactions', value: 8, label: '赞同' },
        { kind: 'replies', value: 3, label: '评论' },
      ],
      actions: [
        { id: 'react', kind: 'react', variant: 'agree', label: '赞同', count: 8, enabled: true },
        { id: 'reply', kind: 'reply', label: '评论', count: 3, enabled: true },
        { id: 'bookmark', kind: 'bookmark', label: '收藏', count: 2, enabled: true },
        { id: 'like', kind: 'react', variant: 'like', label: '喜欢', count: 4, enabled: true },
      ],
    },
    footer: {
      metrics: [{ kind: 'views', value: 1200, label: '浏览' }],
      actions: [{ id: 'share', kind: 'share', label: '分享', enabled: true }],
    },
  },
};

describe('DetailArticle', () => {
  it('keeps unbreakable detail content from widening the media column', () => {
    expect(readerStyles).toContain(
      '.detail-body { grid-template-columns: minmax(0, 1fr); }',
    );
    expect(readerStyles).toMatch(
      /\.detail-body \.content \{[^}]*overflow-wrap: anywhere;/,
    );
  });

  it('renders the detail body as expanded content', () => {
    const markup = renderToStaticMarkup(
      <DetailArticle content={content} onAction={vi.fn()} />,
    );

    expect(markup).toContain('<h1>如何保持专注？</h1>');
    expect(markup).toContain('content content-expanded');
    expect(markup).toContain('先明确真正要解决的问题。');
    expect(markup).not.toContain('问题背景');
    expect(markup).not.toContain('查看问题');
    expect(markup).toContain('查看全部 12 个回答 →');
    expect(markup).toContain('href="https://www.zhihu.com/question/1"');
    expect(markup).toContain('target="_blank"');
    expect(markup).toContain('rel="noreferrer"');
    expect(markup).toContain('超过列表摘要长度的完整正文。');
    expect(markup).toContain('avatar-fallback');
    expect(markup).toContain('<time>');
    expect(markup).not.toContain(content.source.name);
    expect(markup).not.toContain('展开全文');
    expect(markup).not.toContain('查看原文');

    const container = document.createElement('div');
    container.innerHTML = markup;
    expect(container.querySelector('.author-row .card-actions')?.textContent).toBe(
      '赞同 8评论 3收藏 2喜欢 4',
    );
    expect(container.querySelector('.detail-article > .card-actions')?.textContent).toBe(
      '浏览 1,200分享',
    );

    expect(markup.indexOf('如何保持专注？')).toBeLessThan(
      markup.indexOf('先明确真正要解决的问题。'),
    );
    expect(markup.indexOf('先明确真正要解决的问题。')).toBeLessThan(
      markup.indexOf('查看全部 12 个回答'),
    );
    expect(markup.indexOf('查看全部 12 个回答')).toBeLessThan(markup.indexOf('林一'));
    expect(markup.indexOf('林一')).toBeLessThan(markup.indexOf('超过列表摘要长度的完整正文。'));
  });
});
