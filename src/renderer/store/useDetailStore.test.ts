import { describe, expect, it } from 'vitest';
import type { ArticleDetail, ThreadDetail } from '../../types/detail';
import { useDetailStore } from './useDetailStore';

const content: ArticleDetail = {
  id: 'zhihu_42',
  platform: 'zhihu',
  source: { id: 'zhihu', name: '知乎' },
  originalUrl: 'https://www.zhihu.com/question/1/answer/42',
  kind: 'article',
  role: 'answer',
  author: { name: '林一', avatar: '' },
  title: '如何保持专注？',
  body: [{ type: 'richText', html: '<p>正文</p>', plainText: '正文' }],
};

describe('useDetailStore', () => {
  it('replaces and clears the current detail independently', () => {
    useDetailStore.getState().setContent(content);
    expect(useDetailStore.getState().content).toEqual(content);

    useDetailStore.getState().clear();
    expect(useDetailStore.getState().content).toBeUndefined();
  });

  it('stores a thread detail without flattening its entries', () => {
    const thread: ThreadDetail = {
      id: 'v2ex_topic_1',
      platform: 'v2ex',
      source: { id: 'v2ex', name: 'V2EX' },
      originalUrl: 'https://www.v2ex.com/t/1',
      kind: 'thread',
      header: {
        id: 'v2ex_topic_1',
        role: 'topic',
        originalUrl: 'https://www.v2ex.com/t/1',
        title: '测试主题',
        body: [],
        metrics: [],
        actions: [],
      },
      entries: [],
      entryLabel: '回复',
      loadingMode: 'paged',
    };

    useDetailStore.getState().setContent(thread);
    expect(useDetailStore.getState().content).toEqual(thread);
    useDetailStore.getState().clear();
  });
});
