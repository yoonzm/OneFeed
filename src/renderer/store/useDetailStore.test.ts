import { describe, expect, it } from 'vitest';
import type { ArticleDetail } from '../../types/detail';
import { useDetailStore } from './useDetailStore';

const content: ArticleDetail = {
  id: 'zhihu_42',
  platform: 'zhihu',
  source: { id: 'zhihu', name: '知乎' },
  originalUrl: 'https://www.zhihu.com/question/1/answer/42',
  kind: 'article',
  author: { name: '林一', avatar: '' },
  title: '如何保持专注？',
  body: [{ type: 'richText', html: '<p>正文</p>', plainText: '正文' }],
  metrics: [],
  actions: [],
};

describe('useDetailStore', () => {
  it('replaces and clears the current detail independently', () => {
    useDetailStore.getState().setContent(content);
    expect(useDetailStore.getState().content).toEqual(content);

    useDetailStore.getState().clear();
    expect(useDetailStore.getState().content).toBeUndefined();
  });
});
