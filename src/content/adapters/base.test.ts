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
      source: { id: 'test', name: '测试' },
      originalUrl: 'https://example.com/',
      kind: 'post',
      author: { name: '测试用户', avatar: '' },
      blocks: [{ type: 'richText', html: '<span>测试内容</span>', plainText: '测试内容' }],
      metrics: [],
      actions: [],
    };
  }

  triggerAction(itemId: string, actionId: string): boolean {
    void actionId;
    return Boolean(this.getRuntimeElement(itemId));
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
    expect(adapter.triggerAction('first', 'open')).toBe(true);

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
    expect(adapter.triggerAction('first', 'open')).toBe(false);
  });
});
