import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { FeedItem } from '../../types/feed';
import { ActionBar } from './ActionBar';

const item: FeedItem = {
  id: 'post-1',
  platform: 'test',
  source: { id: 'test', name: '测试来源' },
  originalUrl: 'https://example.com/post-1',
  kind: 'post',
  role: 'post',
  author: { name: '测试作者', avatar: '' },
  previewBlocks: [],
  metrics: [{ kind: 'views', value: 1200, label: '浏览' }],
  actions: [
    { id: 'react', kind: 'react', variant: 'like', label: '喜欢', count: 9, enabled: true },
    { id: 'open', kind: 'open', label: '查看原文', enabled: true },
  ],
};

describe('ActionBar', () => {
  it('renders declared actions, passive metrics and the original link', () => {
    const markup = renderToStaticMarkup(
      <ActionBar
        originalUrl={item.originalUrl}
        metrics={item.metrics}
        actions={item.actions}
        onAction={vi.fn()}
      />,
    );

    expect(markup).toContain('喜欢 9');
    expect(markup).toContain('浏览 1,200');
    expect(markup).toContain('href="https://example.com/post-1"');
    expect(markup).toContain('查看原文');
  });

  it('renders metrics that have no matching action', () => {
    const markup = renderToStaticMarkup(
      <ActionBar
        originalUrl={item.originalUrl}
        metrics={[{ kind: 'reactions', value: 4, label: '喜欢' }]}
        actions={[{ id: 'open', kind: 'open', label: '查看回复', enabled: true }]}
        onAction={vi.fn()}
      />,
    );

    expect(markup).toContain('喜欢 4');
    expect(markup).toContain('查看回复');
  });
});
