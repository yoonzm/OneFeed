import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ArticleDetail } from '../../types/detail';
import type {
  CommentCommand,
  CommentItem,
  CommentRequestResult,
} from '../../types/comments';
import { DetailArticle } from '../themes/FocusPaper/DetailArticle';

function comment(id: string, text: string, replyCount?: number): CommentItem {
  return {
    id,
    author: { name: `用户 ${id}`, avatar: '' },
    body: [{ type: 'richText', html: `<p>${text}</p>`, plainText: text }],
    metrics: [],
    replyCount,
  };
}

const content: ArticleDetail = {
  id: 'article-1',
  platform: 'test',
  source: { id: 'test', name: '测试站点' },
  originalUrl: 'https://example.com/article-1',
  kind: 'article',
  role: 'article',
  author: { name: '作者', avatar: '' },
  body: [{ type: 'richText', html: '<p>正文</p>', plainText: '正文' }],
  actionSlots: {
    author: {
      metrics: [{ kind: 'replies', value: 3, label: '评论' }],
      actions: [{ id: 'reply', kind: 'reply', label: '评论', count: 3, enabled: true }],
    },
  },
  comments: {
    targetId: 'article-1',
    count: 3,
    capabilities: { preview: true, all: true, loadMore: true, replies: true },
  },
};

describe('CommentSection', () => {
  let root: Root | undefined;

  afterEach(async () => {
    if (root) await act(async () => root?.unmount());
    root = undefined;
  });

  async function renderArticle(onRequest: (command: CommentCommand) => Promise<CommentRequestResult>) {
    const container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => root?.render(
      <DetailArticle content={content} onAction={vi.fn()} onCommentRequest={onRequest} />,
    ));
    return container;
  }

  it('opens the dialog directly while keeping preview and full loading platform-neutral', async () => {
    const onRequest = vi.fn(async (command: CommentCommand): Promise<CommentRequestResult> => {
      if (command.kind === 'openPreview') {
        return {
          kind: 'loaded',
          snapshot: {
            targetId: command.targetId,
            scope: 'preview',
            total: 3,
            items: [comment('c1', '局部评论')],
            hasMore: true,
          },
        };
      }
      if (command.kind === 'openAll') {
        return {
          kind: 'loaded',
          snapshot: {
            targetId: command.targetId,
            scope: 'all',
            total: 3,
            items: [comment('c1', '局部评论'), comment('c2', '完整评论')],
            hasMore: true,
          },
        };
      }
      if (command.kind === 'loadMore') {
        return {
          kind: 'exhausted',
          snapshot: {
            targetId: command.targetId,
            scope: 'all',
            total: 3,
            items: [comment('c2', '更新后的完整评论'), comment('c3', '最后一条评论')],
            hasMore: false,
          },
        };
      }
      return { kind: 'closed' };
    });
    const container = await renderArticle(onRequest);
    const commentAction = Array.from(container.querySelectorAll('button'))
      .find((button) => button.textContent === '评论 3');

    await act(async () => {
      commentAction?.focus();
      commentAction?.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    const dialog = container.querySelector<HTMLElement>('[role="dialog"]');
    const scroller = container.querySelector<HTMLElement>('.comments-dialog-scroll');
    expect(dialog).not.toBeNull();
    expect(container.querySelector('.comment-section')).toBeNull();
    expect(container.textContent).not.toContain('查看全部评论');
    expect(onRequest.mock.calls.slice(0, 2).map(([command]) => command.kind))
      .toEqual(['openPreview', 'openAll']);
    expect(dialog?.textContent).toContain('局部评论');
    expect(dialog?.textContent).toContain('完整评论');
    Object.defineProperties(scroller!, {
      scrollHeight: { configurable: true, value: 1000 },
      clientHeight: { configurable: true, value: 400 },
      scrollTop: { configurable: true, value: 700, writable: true },
    });
    await act(async () => {
      scroller?.dispatchEvent(new Event('scroll', { bubbles: true }));
      scroller?.dispatchEvent(new Event('scroll', { bubbles: true }));
      await Promise.resolve();
    });

    expect(onRequest.mock.calls.filter(([command]) => command.kind === 'loadMore')).toHaveLength(1);
    expect(dialog?.querySelectorAll('[data-comment-id]')).toHaveLength(3);
    expect(container.textContent).toContain('更新后的完整评论');
    expect(container.textContent).toContain('最后一条评论');
    expect(container.textContent).toContain('已加载当前全部评论');

    const close = container.querySelector<HTMLButtonElement>('[aria-label="关闭评论"]');
    await act(async () => {
      close?.click();
      await Promise.resolve();
    });
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(commentAction);
    expect(onRequest).toHaveBeenCalledWith({ kind: 'closeAll', targetId: 'article-1' });
  });

  it('keeps the original link available after a retryable preview failure', async () => {
    const container = await renderArticle(async () => ({ kind: 'failed', retryable: true }));
    const commentAction = Array.from(container.querySelectorAll('button'))
      .find((button) => button.textContent === '评论 3');

    await act(async () => {
      commentAction?.click();
      await Promise.resolve();
    });

    expect(container.textContent).toContain('评论加载失败');
    expect(container.textContent).toContain('重试');
    expect(container.textContent).not.toContain('在原文查看评论');
  });

  it('opens replies above comments and restores the preserved comments dialog on close', async () => {
    let replyMode = false;
    const onRequest = vi.fn(async (command: CommentCommand): Promise<CommentRequestResult> => {
      if (command.kind === 'openPreview' || command.kind === 'openAll') {
        return {
          kind: 'loaded',
          snapshot: {
            targetId: command.targetId,
            scope: command.kind === 'openPreview' ? 'preview' : 'all',
            total: 2,
            items: [
              comment('parent', '父评论', 2),
              comment('sibling', '另一条评论'),
            ],
            hasMore: false,
          },
        };
      }
      if (command.kind === 'openReplies') {
        replyMode = true;
        return {
          kind: 'loaded',
          snapshot: {
            targetId: command.targetId,
            scope: 'replies',
            rootId: command.commentId,
            total: 2,
            items: [comment('reply-1', '第一条回复')],
            hasMore: true,
          },
        };
      }
      if (command.kind === 'loadMore' && replyMode) {
        return {
          kind: 'exhausted',
          snapshot: {
            targetId: command.targetId,
            scope: 'replies',
            rootId: 'parent',
            total: 2,
            items: [comment('reply-1', '第一条回复'), comment('reply-2', '第二条回复')],
            hasMore: false,
          },
        };
      }
      if (command.kind === 'closeReplies') replyMode = false;
      return { kind: 'closed' };
    });
    const container = await renderArticle(onRequest);
    const commentAction = Array.from(container.querySelectorAll('button'))
      .find((button) => button.textContent === '评论 3');

    await act(async () => {
      commentAction?.click();
      await Promise.resolve();
      await Promise.resolve();
    });
    const commentsDialog = container.querySelector<HTMLElement>('[role="dialog"]')!;
    const commentsScroller = commentsDialog.querySelector<HTMLElement>('.comments-dialog-scroll')!;
    Object.defineProperty(commentsScroller, 'scrollTop', {
      configurable: true,
      value: 180,
      writable: true,
    });
    const replyAction = Array.from(container.querySelectorAll('button'))
      .find((button) => button.textContent === '2 条回复');
    await act(async () => {
      replyAction?.click();
      await Promise.resolve();
    });

    const dialogs = container.querySelectorAll<HTMLElement>('[role="dialog"]');
    const replyDialog = dialogs[1];
    const replyScroller = replyDialog?.querySelector<HTMLElement>('.comments-dialog-scroll');
    expect(dialogs).toHaveLength(2);
    expect(commentsDialog.textContent).toContain('另一条评论');
    expect(commentsDialog.parentElement?.getAttribute('aria-hidden')).toBe('true');
    expect(replyDialog?.querySelector('h2')?.textContent).toBe('回复');
    expect(replyDialog?.textContent).toContain('父评论');
    expect(replyDialog?.textContent).toContain('第一条回复');
    expect(replyDialog?.textContent).not.toContain('另一条评论');

    Object.defineProperties(replyScroller!, {
      scrollHeight: { configurable: true, value: 900 },
      clientHeight: { configurable: true, value: 400 },
      scrollTop: { configurable: true, value: 600, writable: true },
    });
    await act(async () => {
      replyScroller?.dispatchEvent(new Event('scroll', { bubbles: true }));
      await Promise.resolve();
    });

    expect(onRequest).toHaveBeenCalledWith({ kind: 'loadMore', targetId: 'article-1' });
    expect(replyDialog?.textContent).toContain('第二条回复');
    expect(replyDialog?.textContent).toContain('已加载当前全部回复');

    await act(async () => {
      container.querySelector<HTMLButtonElement>('[aria-label="关闭回复"]')?.click();
      await Promise.resolve();
    });
    expect(onRequest).toHaveBeenCalledWith({ kind: 'closeReplies', targetId: 'article-1' });
    expect(container.querySelectorAll('[role="dialog"]')).toHaveLength(1);
    expect(container.querySelector('[role="dialog"]')).toBe(commentsDialog);
    expect(commentsScroller.scrollTop).toBe(180);
    expect(document.activeElement).toBe(replyAction);

    await act(async () => {
      replyAction?.click();
      await Promise.resolve();
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      await Promise.resolve();
    });
    expect(container.querySelectorAll('[role="dialog"]')).toHaveLength(1);

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      await Promise.resolve();
    });
    expect(container.querySelectorAll('[role="dialog"]')).toHaveLength(0);
  });
});
