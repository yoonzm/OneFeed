import { describe, expect, it } from 'vitest';
import { ZhihuCommentsController } from './zhihuComments';

function commentHtml(id: string, author: string, text: string, content = `<p>${text}</p>`): string {
  return `
    <div data-id="${id}">
      <a href="https://www.zhihu.com/people/${id}">${author}</a>
      <img class="Avatar" src="https://pic.example/${id}.png" alt="${author}" />
      <div class="CommentContent">${content}</div>
      <span>2 小时前</span><span>北京</span><span>热评</span>
      <button><svg class="ZDI--HeartFill24"></svg>12</button>
      <button>查看全部 3 条回复</button>
    </div>`;
}

describe('ZhihuCommentsController', () => {
  it('loads scoped preview and modal snapshots without leaking duplicate DOM roots', async () => {
    document.body.innerHTML = `
      <article class="AnswerItem" data-zop='{"type":"answer","itemId":"42"}'>
        <button class="ContentItem-action">3 条评论</button>
      </article>`;
    const target = document.querySelector('.AnswerItem')!;
    const commentButton = target.querySelector('button')!;
    commentButton.addEventListener('click', () => {
      target.insertAdjacentHTML('beforeend', `
        <div class="Comments-container">
          <strong>3 条评论</strong>
          ${commentHtml(
            'c1',
            '测试用户一',
            '局部评论',
            '<p>局部评论<img class="sticker" src="https://pic.example/emoji.png" alt="[微笑]" />继续</p>',
          )}
          <div data-id="c1-reply">
            <a href="https://www.zhihu.com/people/c1-reply">测试用户二</a>
            <div class="CommentContent"><p>已加载的子回复</p></div>
          </div>
          <div class="all-comments" style="cursor: pointer">
            点击查看全部评论
            <svg class="ZDI--ArrowRightSmall24"></svg>
          </div>
        </div>`);
      const parentComment = target.querySelector('[data-id="c1"]');
      const childComment = target.querySelector('[data-id="c1-reply"]');
      if (parentComment && childComment) parentComment.appendChild(childComment);
      target.querySelector('.all-comments')?.addEventListener('click', () => {
        document.body.insertAdjacentHTML('beforeend', `
          <div class="Modal-content">
            <strong>3 条评论</strong>
            <div class="modal-scroll" style="overflow-y: auto">
              ${commentHtml('c1', '测试用户一', '弹层中的重复评论')}
              ${commentHtml('c2', '测试用户三', '弹层新增评论')}
            </div>
          </div>`);
        const scroller = document.querySelector<HTMLElement>('.modal-scroll')!;
        Object.defineProperties(scroller, {
          scrollHeight: { configurable: true, value: 800, writable: true },
          clientHeight: { configurable: true, value: 200 },
          scrollTop: { configurable: true, value: 0, writable: true },
        });
        scroller.addEventListener('scroll', () => {
          if (document.querySelector('[data-id="c3"]')) return;
          scroller.insertAdjacentHTML(
            'beforeend',
            commentHtml('c3', '测试用户四', '滚动加载评论'),
          );
          Object.defineProperty(scroller, 'scrollHeight', {
            configurable: true,
            value: 1200,
            writable: true,
          });
        });
      });
    });

    const controller = new ZhihuCommentsController(() => target, () => 'zhihu_42');
    const preview = await controller.request({ kind: 'openPreview', targetId: 'zhihu_42' });

    expect(preview).toMatchObject({
      kind: 'loaded',
      snapshot: {
        scope: 'preview',
        total: 3,
        items: [
          {
            id: 'c1',
            author: { name: '测试用户一' },
            publishedAt: '2 小时前',
            metadataLabels: ['北京', '热评'],
            metrics: [{ kind: 'reactions', value: 12, label: '赞' }],
            replyCount: 3,
          },
          { id: 'c1-reply', parentId: 'c1' },
        ],
      },
    });
    if (preview.kind !== 'loaded') throw new Error('预览评论应加载成功');
    const previewBody = preview.snapshot.items[0]?.body;
    expect(previewBody).toHaveLength(1);
    expect(previewBody?.[0]).toMatchObject({
      type: 'richText',
      plainText: '局部评论[微笑]继续',
    });
    expect(previewBody?.[0]?.type === 'richText' ? previewBody[0].html : '')
      .toContain('data-onefeed-kind="emoji"');
    expect(previewBody?.some((block) => block.type === 'gallery')).toBe(false);

    const all = await controller.request({ kind: 'openAll', targetId: 'zhihu_42' });
    expect(all).toMatchObject({
      kind: 'loaded',
      snapshot: {
        scope: 'all',
        items: [{ id: 'c1' }, { id: 'c2' }],
        hasMore: true,
      },
    });

    const more = await controller.request({ kind: 'loadMore', targetId: 'zhihu_42' });
    expect(more).toMatchObject({
      kind: 'loaded',
      snapshot: {
        items: [{ id: 'c1' }, { id: 'c2' }, { id: 'c3' }],
        hasMore: true,
      },
    });
    expect(await controller.request({
      kind: 'openPreview',
      targetId: 'zhihu_other',
    })).toEqual({ kind: 'failed', retryable: false });
    controller.disconnect();
  });
});
