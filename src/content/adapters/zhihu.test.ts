import { describe, expect, it, vi } from 'vitest';
import {
  parseCount,
  parseZhihuCard,
  triggerZhihuAction,
  ZhihuAdapter,
} from './zhihu';

describe('ZhihuAdapter feed channels', () => {
  it('reads the current header channels and ignores unrelated navigation', () => {
    document.body.innerHTML = `
      <header class="AppHeader" role="banner">
        <nav>
          <a href="/follow">关注</a>
          <a class="is-active" href="/" aria-current="page">推荐</a>
          <a href="/hot">热榜</a>
          <a href="/column">专栏</a>
          <a href="/roundtable">圆桌</a>
        </nav>
      </header>`;
    const adapter = new ZhihuAdapter(vi.fn());
    adapter.init();

    expect(adapter.getFeedChannels().map(({ label, active }) => ({ label, active }))).toEqual([
      { label: '关注', active: false },
      { label: '推荐', active: true },
      { label: '热榜', active: false },
    ]);
    adapter.disconnect();
  });
});

describe('parseCount', () => {
  it('parses plain and abbreviated Chinese counts', () => {
    expect(parseCount('赞同 1,234')).toBe(1234);
    expect(parseCount('2.5 万赞同')).toBe(25000);
    expect(parseCount('暂无')).toBe(0);
  });
});

describe('parseZhihuCard', () => {
  it('normalizes a Zhihu hot-list question', () => {
    document.body.innerHTML = `
      <section class="HotItem">
        <div class="HotItem-index">3</div>
        <div class="HotItem-content">
          <a href="/question/2072481373085028433">
            <h2 class="HotItem-title">如何评价新的模型套餐？</h2>
            <p class="HotItem-excerpt">调用量发生了明显变化。<script>alert(1)</script></p>
          </a>
          <div class="HotItem-metrics">590 万热度</div>
        </div>
        <a class="HotItem-img" href="/question/2072481373085028433">
          <img src="https://pic.example/hot.png" alt="热榜配图" />
        </a>
      </section>`;

    const item = parseZhihuCard(document.querySelector('.HotItem')!);

    expect(item).toMatchObject({
      id: 'zhihu_question_2072481373085028433',
      kind: 'discussion',
      role: 'question',
      title: '如何评价新的模型套餐？',
      sequence: 3,
      context: { reason: { type: 'recommended', label: '热榜' } },
      metrics: [{ kind: 'score', value: 5900000, label: '热度' }],
      actions: [{ id: 'open', kind: 'open', label: '查看原文' }],
    });
    expect(item?.originalUrl).toBe('http://localhost:3000/question/2072481373085028433');
    expect(item?.previewBlocks).toEqual([
      {
        type: 'richText',
        html: '调用量发生了明显变化。',
        plainText: '调用量发生了明显变化。',
      },
      {
        type: 'gallery',
        items: [{ url: 'https://pic.example/hot.png', alt: '热榜配图' }],
      },
    ]);
  });

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
        <button class="VoteButton VoteButton--down" aria-label="踩 3">踩</button>
        <button aria-label="12 条评论">12 条评论</button>
        <button class="ContentItem-action">收藏 8</button>
        <button class="ContentItem-action" aria-label="喜欢 6">喜欢</button>
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
      actions: [
        { id: 'react', label: '赞同', count: 12000 },
        { id: 'downvote', label: '踩', count: 3 },
        { id: 'reply', label: '评论', count: 12 },
        { id: 'bookmark', label: '收藏', count: 8 },
        { id: 'like', label: '喜欢', count: 6 },
        { id: 'open', label: '查看原文' },
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

  it.each([
    ['缺失', ''],
    ['为 0', '<button class="VoteButton VoteButton--down">踩 0</button>'],
  ])('踩数%s时不展示踩操作', (_, downvoteButton) => {
    document.body.innerHTML = `
      <article class="TopstoryItem" data-id="answer-42">
        <div class="RichContent-inner"><p>先把信息变少。</p></div>
        ${downvoteButton}
      </article>`;

    const item = parseZhihuCard(document.querySelector('.TopstoryItem')!);

    expect(item?.actions.some((action) => action.id === 'downvote')).toBe(false);
    expect(item?.actions.map((action) => action.label)).toEqual([
      '赞同',
      '评论',
      '收藏',
      '喜欢',
      '查看原文',
    ]);
    expect(item?.actions.slice(0, 4).map((action) => action.count)).toEqual([0, 0, 0, 0]);
  });

  it.each([
    ['react', '赞同'],
    ['downvote', '踩'],
    ['reply', '评论'],
    ['bookmark', '收藏'],
    ['like', '喜欢'],
  ])('proxies the %s action to its Zhihu control', (actionId, label) => {
    document.body.innerHTML = `
      <article>
        <button aria-label="${label} 2">${label}</button>
      </article>`;
    const button = document.querySelector('button')!;
    const click = vi.spyOn(button, 'click');

    expect(triggerZhihuAction(document.querySelector('article')!, actionId)).toBe(true);
    expect(click).toHaveBeenCalledOnce();
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
