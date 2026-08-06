import { describe, expect, it, vi } from 'vitest';
import type { FeedItem } from '../../types/feed';
import { BaseAdapter } from './base';

class TestAdapter extends BaseAdapter {
  protected readonly cardSelector = '[data-feed-card]';

  parseCard(element: Element): FeedItem | null {
    const id = element.getAttribute('data-feed-card');
    if (!id) return null;
    return {
      id,
      platform: 'test',
      originalUrl: 'https://example.com/',
      author: { name: '测试用户', avatar: '' },
      contentHtml: '<span>测试内容</span>',
      stats: { likes: 0, comments: 0 },
    };
  }

  triggerAction(): boolean {
    return false;
  }
}

describe('BaseAdapter', () => {
  it('scans existing cards and rescans after an infinite-feed update', async () => {
    document.body.innerHTML = '<article data-feed-card="first"></article>';
    const onItems = vi.fn();
    const adapter = new TestAdapter(onItems);

    adapter.init();
    expect(onItems).toHaveBeenLastCalledWith([
      expect.objectContaining({ id: 'first' }),
    ]);

    document.body.insertAdjacentHTML(
      'beforeend',
      '<article data-feed-card="second"></article>',
    );
    await new Promise((resolve) => window.setTimeout(resolve, 180));

    expect(onItems).toHaveBeenLastCalledWith([
      expect.objectContaining({ id: 'first' }),
      expect.objectContaining({ id: 'second' }),
    ]);
    adapter.disconnect();
  });
});
