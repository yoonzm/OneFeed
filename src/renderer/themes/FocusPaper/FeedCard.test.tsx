import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { FeedItem } from '../../../types/feed';
import { FeedCard } from './FeedCard';

const readerStyles = readFileSync(resolve('src/renderer/styles.css'), 'utf8');

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

describe('FeedCard', () => {
  it('renders a quiet seen marker without changing the feed item protocol', () => {
    const markup = renderToStaticMarkup(
      <FeedCard item={shortReply} index={0} isSeen onAction={vi.fn()} />,
    );

    expect(markup).toContain('feed-card-seen');
    expect(markup).toContain('card-seen-marker');
    expect(markup).toContain('已看过');
  });

  it('renders short plain text as a compact card with author metadata but no avatar', () => {
    const markup = renderToStaticMarkup(
      <FeedCard item={shortReply} index={0} onAction={vi.fn()} />,
    );

    expect(markup).toContain('item-card-compact');
    expect(markup).toContain('class="content"');
    expect(markup).not.toContain('content-expanded');
    expect(markup).toContain('class="card-meta-row"');
    expect(markup).toContain('class="card-author">Alice</span>');
    expect(markup).not.toContain('author-row');
    expect(markup).not.toContain('avatar');
    expect(markup).not.toContain('展开全文');
  });

  it('renders a provided avatar beside the linked author name', () => {
    const markup = renderToStaticMarkup(
      <FeedCard
        item={{
          ...shortReply,
          author: {
            name: 'Alice',
            avatar: 'https://example.com/alice.png',
            link: 'https://example.com/alice',
          },
        }}
        index={0}
        onAction={vi.fn()}
      />,
    );

    expect(markup).toContain('class="card-author-avatar"');
    expect(markup).toContain('src="https://example.com/alice.png"');
    expect(markup).toContain('href="https://example.com/alice"');
    expect(markup).toContain('loading="lazy"');
  });

  it('orders title, body and remaining metadata as three semantic rows', () => {
    const markup = renderToStaticMarkup(
      <FeedCard
        item={{
          ...shortReply,
          title: '测试标题',
          publishedAt: '2026-08-12T09:00:00+08:00',
          updatedAt: '2026-08-12T10:00:00+08:00',
          context: {
            community: { name: '分享创造' },
            tags: [{ name: '设计' }],
          },
          flags: { pinned: true },
          metrics: [{ kind: 'views', value: 42, label: '浏览' }],
          actions: [{ id: 'reply', kind: 'reply', label: '回复', enabled: true }],
        }}
        index={0}
        onAction={vi.fn()}
      />,
    );

    const titleIndex = markup.indexOf('card-title-row');
    const bodyIndex = markup.indexOf('card-body-row');
    const metaIndex = markup.indexOf('card-meta-row');

    expect(titleIndex).toBeGreaterThan(-1);
    expect(bodyIndex).toBeGreaterThan(titleIndex);
    expect(metaIndex).toBeGreaterThan(bodyIndex);
    expect(markup).toContain('Alice');
    expect(markup).toContain('<time>');
    expect(markup).not.toContain('已编辑');
    expect(markup).not.toContain(shortReply.source.name);
    expect(markup).toContain('分享创造');
    expect(markup).toContain('#设计');
    expect(markup).toContain('置顶');
    expect(markup).toContain('浏览 42');
    expect(markup).toContain('回复');
  });

  it('keeps contextual short text compact', () => {
    const markup = renderToStaticMarkup(
      <FeedCard
        item={{
          ...shortReply,
          context: { community: { name: '分享创造' } },
        }}
        index={0}
        onAction={vi.fn()}
      />,
    );

    expect(markup).toContain('item-card-compact');
  });

  it('renders a short title without body blocks as a compact card', () => {
    const markup = renderToStaticMarkup(
      <FeedCard
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

    expect(markup).toContain('item-card-compact');
    expect(markup).toContain('>问</a>');
    expect(markup).not.toContain('查看原文');
  });

  it('keeps long text collapsed without offering expansion', () => {
    const plainText = '这是一段需要保留完整阅读节奏的较长内容。'.repeat(20);
    const markup = renderToStaticMarkup(
      <FeedCard
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

    expect(markup).not.toContain('item-card-compact');
    expect(markup).toContain('class="content"');
    expect(markup).not.toContain('content-expanded');
    expect(markup).not.toContain('展开全文');
    expect(markup).not.toContain('收起');
  });

  it('places a supplementary single image in the side-media region', () => {
    const markup = renderToStaticMarkup(
      <FeedCard
        item={{
          ...shortReply,
          title: '带配图的正文',
          previewBlocks: [
            {
              type: 'richText',
              html: '<p>正文摘要</p>',
              plainText: '正文摘要',
            },
            {
              type: 'gallery',
              items: [{
                url: 'https://example.com/cover.jpg',
                alt: '正文配图',
                aspectRatio: 1.5,
              }],
            },
          ],
        }}
        index={0}
        onAction={vi.fn()}
      />,
    );

    expect(markup).toContain('feed-card-side-media');
    expect(markup).toContain('item-card-titled');
    expect(markup).toContain('class="card-media-aside"');
    expect(markup.indexOf('card-body-row')).toBeLessThan(markup.indexOf('card-media-aside'));
    expect(markup.indexOf('card-media-aside')).toBeLessThan(markup.indexOf('card-meta-row'));
    expect(readerStyles).toContain('.feed-card-side-media.item-card-titled .card-main');
  });

  it('keeps image-led and extreme-ratio media in the main content flow', () => {
    const imageLedMarkup = renderToStaticMarkup(
      <FeedCard
        item={{
          ...shortReply,
          title: '图片内容',
          previewBlocks: [{
            type: 'gallery',
            items: [{ url: 'https://example.com/cover.jpg', alt: '主图片' }],
          }],
        }}
        index={0}
        onAction={vi.fn()}
      />,
    );
    const portraitMarkup = renderToStaticMarkup(
      <FeedCard
        item={{
          ...shortReply,
          previewBlocks: [
            {
              type: 'richText',
              html: '<p>正文摘要</p>',
              plainText: '正文摘要',
            },
            {
              type: 'gallery',
              items: [{
                url: 'https://example.com/poster.jpg',
                alt: '竖版长图',
                width: 600,
                height: 1200,
              }],
            },
          ],
        }}
        index={0}
        onAction={vi.fn()}
      />,
    );

    expect(imageLedMarkup).not.toContain('feed-card-side-media');
    expect(imageLedMarkup).not.toContain('card-media-aside');
    expect(portraitMarkup).not.toContain('feed-card-side-media');
    expect(portraitMarkup).not.toContain('card-media-aside');
  });
});
