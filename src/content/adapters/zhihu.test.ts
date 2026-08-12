import { describe, expect, it } from 'vitest';
import { parseCount, parseZhihuCard } from './zhihu';

describe('parseCount', () => {
  it('parses plain and abbreviated Chinese counts', () => {
    expect(parseCount('赞同 1,234')).toBe(1234);
    expect(parseCount('2.5 万赞同')).toBe(25000);
    expect(parseCount('暂无')).toBe(0);
  });
});

describe('parseZhihuCard', () => {
  it('normalizes a Zhihu card and sanitizes content', () => {
    document.body.innerHTML = `
      <article class="TopstoryItem" data-id="answer-42">
        <h2 class="ContentItem-title"><a href="/question/1/answer/42">如何保持专注？</a></h2>
        <a class="UserLink-link" href="/people/reader">林一</a>
        <img class="Avatar" src="https://pic.example/avatar.png" />
        <div class="RichContent-inner">
          <p style="color:red">先把信息变少。<script>alert(1)</script></p>
          <img data-original="https://pic.example/answer.jpg" alt="书桌" />
        </div>
        <button class="Button--voteUp">赞同 1.2 万</button>
        <button aria-label="12 条评论">12 条评论</button>
      </article>`;

    const item = parseZhihuCard(document.querySelector('.TopstoryItem')!);

    expect(item).toMatchObject({
      id: 'zhihu_answer-42',
      kind: 'article',
      role: 'answer',
      title: '如何保持专注？',
      author: { name: '林一' },
      metrics: [
        { kind: 'reactions', value: 12000, label: '赞同' },
        { kind: 'replies', value: 12, label: '评论' },
      ],
    });
    expect(item?.originalUrl).toBe('http://localhost:3000/question/1/answer/42');
    const text = item?.previewBlocks.find((block) => block.type === 'richText');
    const gallery = item?.previewBlocks.find((block) => block.type === 'gallery');
    expect(text?.html).toContain('先把信息变少。');
    expect(text?.html).not.toContain('script');
    expect(text?.html).not.toContain('style=');
    expect(gallery?.items).toEqual([{ url: 'https://pic.example/answer.jpg', alt: '书桌' }]);
    expect(item).not.toHaveProperty('rawElementRef');
  });

  it('ignores elements without readable content', () => {
    document.body.innerHTML = '<article class="TopstoryItem"><h2>只有标题</h2></article>';
    expect(parseZhihuCard(document.querySelector('article')!)).toBeNull();
  });

  it('uses nested Zhihu metadata to deduplicate wrapper and content cards', () => {
    document.body.innerHTML = `
      <article class="TopstoryItem">
        <div
          class="ContentItem AnswerItem"
          data-zop='{"authorName":"林一","itemId":"answer-42","title":"如何保持专注？"}'
        >
          <h2 class="ContentItem-title"><a href="/question/1/answer/answer-42">如何保持专注？</a></h2>
          <div class="RichContent-inner"><p>先把信息变少。</p></div>
        </div>
      </article>`;

    const wrapper = parseZhihuCard(document.querySelector('.TopstoryItem')!);
    const content = parseZhihuCard(document.querySelector('.AnswerItem')!);

    expect(wrapper?.id).toBe('zhihu_answer-42');
    expect(content?.id).toBe('zhihu_answer-42');
    expect(wrapper?.author.name).toBe('林一');
  });
});
