import { afterEach, describe, expect, it } from 'vitest';
import {
  parseXiaohongshuCommentSnapshot,
  XiaohongshuCommentsController,
} from './xiaohongshuComments';

const TARGET_ID = 'xiaohongshu_note-1';

function commentHtml({
  id,
  author,
  text,
  reactions = '赞',
  replies = '回复',
  sub = false,
  emoji = false,
}: {
  id: string;
  author: string;
  text: string;
  reactions?: string;
  replies?: string;
  sub?: boolean;
  emoji?: boolean;
}): string {
  return `
    <div class="comment-item${sub ? ' comment-item-sub' : ''}" id="comment-${id}">
      <div class="comment-inner-container">
        <div class="avatar">
          <a href="/user/profile/${author}">
            <img class="avatar-item" src="https://sns-avatar-qc.xhscdn.com/${author}.jpg" />
          </a>
        </div>
        <div class="right">
          <div class="author-wrapper"><a class="name" href="/user/profile/${author}">${author}</a></div>
          <div class="content">
            <span class="note-text"><span>${text}</span>${emoji
              ? '<img class="note-content-emoji" src="https://picasso-static.xiaohongshu.com/emoji.png" />'
              : ''}</span>
          </div>
          <div class="info">
            <div class="date"><span>08-20</span><span class="location">北京</span></div>
            <div class="interactions">
              <div class="like"><span class="count">${reactions}</span></div>
              <div class="reply"><span class="count">${replies}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>`;
}

function parentCommentHtml(
  root: string,
  replies = '',
  showMore = '',
): string {
  return `
    <div class="parent-comment">
      ${root}
      ${replies || showMore ? `
        <div class="reply-container">
          <div class="list-container">${replies}</div>
          ${showMore ? `<div class="show-more">${showMore}</div>` : ''}
        </div>` : ''}
    </div>`;
}

function renderComments(): Element {
  document.body.innerHTML = `
    <div id="noteContainer" class="note-container">
      <div class="note-scroller">
        <div class="comments-container">
          <div class="total">共 12 条评论</div>
          <div class="list-container">
            ${parentCommentHtml(
              commentHtml({
                id: 'c1',
                author: '读者一',
                text: '第一条评论',
                reactions: '1.2万',
                replies: '3',
                emoji: true,
              }),
              commentHtml({ id: 'r1', author: '读者二', text: '第一条回复', sub: true }),
              '展开 2 条回复',
            )}
            ${parentCommentHtml(commentHtml({
              id: 'c2',
              author: '读者三',
              text: '第二条评论',
            }))}
          </div>
        </div>
      </div>
    </div>`;
  return document.querySelector('#noteContainer')!;
}

afterEach(() => {
  document.body.innerHTML = '';
  window.history.replaceState({}, '', '/');
});

describe('Xiaohongshu comments', () => {
  it('normalizes only parent comments while preserving emoji and metadata', () => {
    const target = renderComments();
    const snapshot = parseXiaohongshuCommentSnapshot(target, TARGET_ID, 'all');

    expect(snapshot).toMatchObject({
      targetId: TARGET_ID,
      scope: 'all',
      total: 12,
      hasMore: true,
      items: [
        {
          id: 'c1',
          author: {
            name: '读者一',
            avatar: 'https://sns-avatar-qc.xhscdn.com/%E8%AF%BB%E8%80%85%E4%B8%80.jpg',
            link: 'http://localhost:3000/user/profile/%E8%AF%BB%E8%80%85%E4%B8%80',
          },
          metadataLabels: ['08-20', '北京'],
          metrics: [{ kind: 'reactions', value: 12000, label: '赞' }],
          replyCount: 3,
        },
        { id: 'c2', author: { name: '读者三' } },
      ],
    });
    expect(snapshot.items).toHaveLength(2);
    expect(snapshot.items[0]?.body[0]).toMatchObject({
      type: 'richText',
      plainText: '第一条评论表情',
      html: expect.stringContaining('data-onefeed-kind="emoji"'),
    });
  });

  it('loads inline replies and additional parent comments through original controls', async () => {
    const target = renderComments();
    const controller = new XiaohongshuCommentsController(
      () => target,
      () => TARGET_ID,
    );
    const showMore = target.querySelector<HTMLElement>('.show-more')!;
    showMore.addEventListener('click', () => {
      showMore.previousElementSibling?.insertAdjacentHTML('beforeend', commentHtml({
        id: 'r2',
        author: '读者四',
        text: '第二条回复',
        sub: true,
      }));
      showMore.remove();
    });
    const scroller = target.querySelector<HTMLElement>('.note-scroller')!;
    Object.defineProperties(scroller, {
      scrollHeight: { configurable: true, value: 900 },
      clientHeight: { configurable: true, value: 400 },
      scrollTop: { configurable: true, value: 0, writable: true },
    });
    scroller.addEventListener('scroll', () => {
      const list = target.querySelector('.comments-container > .list-container')!;
      list.insertAdjacentHTML('beforeend', parentCommentHtml(commentHtml({
        id: 'c3',
        author: '读者五',
        text: '滚动加载的评论',
      })));
    }, { once: true });

    await expect(controller.request({
      kind: 'openPreview',
      targetId: TARGET_ID,
    })).resolves.toMatchObject({
      kind: 'loaded',
      snapshot: { scope: 'preview', items: [{ id: 'c1' }, { id: 'c2' }] },
    });
    await expect(controller.request({
      kind: 'openReplies',
      targetId: TARGET_ID,
      commentId: 'c1',
    })).resolves.toMatchObject({
      kind: 'loaded',
      snapshot: {
        scope: 'replies',
        rootId: 'c1',
        total: 3,
        hasMore: true,
        items: [{ id: 'r1', parentId: 'c1' }],
      },
    });
    await expect(controller.request({
      kind: 'loadMore',
      targetId: TARGET_ID,
    })).resolves.toMatchObject({
      kind: 'exhausted',
      snapshot: {
        scope: 'replies',
        hasMore: false,
        items: [{ id: 'r1' }, { id: 'r2' }],
      },
    });
    await controller.request({ kind: 'closeReplies', targetId: TARGET_ID });
    await expect(controller.request({
      kind: 'loadMore',
      targetId: TARGET_ID,
    })).resolves.toMatchObject({
      kind: 'loaded',
      snapshot: {
        scope: 'all',
        items: [{ id: 'c1' }, { id: 'c2' }, { id: 'c3' }],
      },
    });
    controller.disconnect();
  });

  it('rejects commands for a stale detail target', async () => {
    const target = renderComments();
    const controller = new XiaohongshuCommentsController(
      () => target,
      () => TARGET_ID,
    );

    await expect(controller.request({
      kind: 'openAll',
      targetId: 'xiaohongshu_stale',
    })).resolves.toEqual({ kind: 'failed', retryable: false });
  });
});
