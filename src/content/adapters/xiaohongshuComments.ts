import DOMPurify from 'dompurify';
import { i18n } from '../../i18n';
import type {
  CommentCommand,
  CommentItem,
  CommentRequestResult,
  CommentSnapshot,
} from '../../types/comments';
import type { FeedBlock, FeedMetric } from '../../types/feed';
import { parseXiaohongshuCount } from './xiaohongshu';

const COMMENTS_CONTAINER_SELECTOR = '.comments-container';
const COMMENT_WAIT_MS = 3000;
const PREVIEW_LIMIT = 5;

type RichTextBlock = Extract<FeedBlock, { type: 'richText' }>;

function normalizedText(element: Element | null | undefined): string {
  return element?.textContent?.replace(/[\s\u200b]+/g, ' ').trim() || '';
}

function absoluteUrl(value: string): string {
  if (!value) return '';
  try {
    return new URL(value, window.location.href).href;
  } catch {
    return '';
  }
}

function commentId(item: Element): string | undefined {
  return item.id.match(/^comment-(.+)$/)?.[1];
}

function findCommentsContainer(root: ParentNode): Element | undefined {
  if (root instanceof Element && root.matches(COMMENTS_CONTAINER_SELECTOR)) return root;
  return root.querySelector(COMMENTS_CONTAINER_SELECTOR) || undefined;
}

/** 父评论容器还包含已加载回复，只取其第一个直属 comment-item。 */
function topLevelCommentItems(root: ParentNode): Element[] {
  const container = findCommentsContainer(root);
  if (!container) return [];
  return Array.from(container.querySelectorAll(':scope > .list-container > .parent-comment'))
    .map((parent) => Array.from(parent.children)
      .find((child) => child.matches('.comment-item:not(.comment-item-sub)')))
    .filter((item): item is Element => Boolean(item));
}

function replyCommentItems(parent: Element): Element[] {
  const replyContainer = Array.from(parent.children)
    .find((child) => child.matches('.reply-container'));
  if (!replyContainer) return [];
  return Array.from(replyContainer.querySelectorAll('.comment-item.comment-item-sub'));
}

function createCommentBody(content: Element): RichTextBlock | null {
  const clone = content.cloneNode(true) as Element;
  clone.querySelectorAll('img.note-content-emoji').forEach((image) => {
    const src = absoluteUrl(image.getAttribute('src') || '');
    if (!src) {
      image.remove();
      return;
    }
    image.setAttribute('src', src);
    image.setAttribute('alt', image.getAttribute('alt') || i18n.t('comment.emoji'));
    image.setAttribute('loading', 'lazy');
    image.setAttribute('data-onefeed-kind', 'emoji');
  });
  clone.querySelectorAll('img:not([data-onefeed-kind="emoji"]), video, button, svg, noscript')
    .forEach((node) => node.remove());
  clone.querySelectorAll('a[href]').forEach((link) => {
    const href = absoluteUrl(link.getAttribute('href') || '');
    if (!href) {
      link.removeAttribute('href');
      return;
    }
    link.setAttribute('href', href);
    link.setAttribute('target', '_blank');
    link.setAttribute('rel', 'noreferrer');
  });
  clone.querySelectorAll('[style], [class], [id]').forEach((node) => {
    node.removeAttribute('style');
    node.removeAttribute('class');
    node.removeAttribute('id');
  });
  const html = DOMPurify.sanitize(clone.innerHTML, {
    ALLOWED_TAGS: ['span', 'br', 'a', 'img'],
    ALLOWED_ATTR: [
      'href',
      'target',
      'rel',
      'src',
      'alt',
      'loading',
      'data-onefeed-kind',
    ],
  });
  const textContainer = document.createElement('div');
  textContainer.innerHTML = html;
  textContainer.querySelectorAll('img[data-onefeed-kind="emoji"]').forEach((image) => {
    image.replaceWith(document.createTextNode(image.getAttribute('alt') || ''));
  });
  const plainText = normalizedText(textContainer);
  return plainText ? { type: 'richText', html, plainText } : null;
}

function parseXiaohongshuComment(item: Element, parentId?: string): CommentItem | null {
  const id = commentId(item);
  const right = item.querySelector('.comment-inner-container > .right');
  const content = right?.querySelector(':scope > .content');
  if (!id || !right || !content) return null;
  const body = createCommentBody(content);
  if (!body) return null;

  const authorLink = right.querySelector<HTMLAnchorElement>('.author-wrapper a.name[href]');
  const avatar = item.querySelector<HTMLImageElement>(
    '.comment-inner-container > .avatar img.avatar-item[src]',
  );
  const dateLabel = normalizedText(right.querySelector('.info .date > span:not(.location)'));
  const location = normalizedText(right.querySelector('.info .date > .location'));
  const reactions = parseXiaohongshuCount(
    normalizedText(right.querySelector('.info .interactions .like .count')),
  );
  const replyCount = parentId ? 0 : parseXiaohongshuCount(
    normalizedText(right.querySelector('.info .interactions .reply .count')),
  );
  const metadataLabels = [dateLabel, location].filter(Boolean);
  const metrics: FeedMetric[] = reactions
    ? [{ kind: 'reactions', value: reactions, label: i18n.t('adapter.reactions') }]
    : [];

  return {
    id,
    parentId,
    author: {
      name: normalizedText(authorLink) || i18n.t('adapter.xiaohongshuUser'),
      avatar: absoluteUrl(avatar?.getAttribute('src') || ''),
      link: absoluteUrl(authorLink?.getAttribute('href') || '') || undefined,
    },
    body: [body],
    // 小红书常返回“08-20”“昨天”等展示文本，不把它交给 Date 解析以免伪造年份。
    metadataLabels: metadataLabels.length ? metadataLabels : undefined,
    metrics,
    replyCount: replyCount || undefined,
  };
}

function commentsTotal(container: Element, fallback: number): number {
  const value = normalizedText(container.querySelector(':scope > .total'))
    .match(/([\d,.]+\s*[万千]?)(?:\s*条)?评论/)?.[1];
  return value ? parseXiaohongshuCount(value) : fallback;
}

export function parseXiaohongshuCommentSnapshot(
  root: ParentNode,
  targetId: string,
  scope: 'preview' | 'all',
  forceExhausted = false,
): CommentSnapshot {
  const container = findCommentsContainer(root);
  const items = topLevelCommentItems(root)
    .map((item) => parseXiaohongshuComment(item))
    .filter((item): item is CommentItem => item !== null);
  const total = container ? commentsTotal(container, items.length) : items.length;
  const visibleItems = scope === 'preview' ? items.slice(0, PREVIEW_LIMIT) : items;
  return {
    targetId,
    scope,
    total,
    items: visibleItems,
    hasMore: forceExhausted ? false : items.length < total,
  };
}

function parseReplySnapshot(
  parent: Element,
  targetId: string,
  rootId: string,
  totalHint: number,
  forceExhausted = false,
): CommentSnapshot {
  const items = replyCommentItems(parent)
    .map((item) => parseXiaohongshuComment(item, rootId))
    .filter((item): item is CommentItem => item !== null);
  const control = parent.querySelector('.reply-container > .show-more');
  const canExpand = Boolean(control && /^展开/.test(normalizedText(control)));
  return {
    targetId,
    scope: 'replies',
    rootId,
    total: Math.max(totalHint, items.length),
    items,
    hasMore: forceExhausted ? false : canExpand,
  };
}

function findParentComment(root: ParentNode, rootId: string): Element | undefined {
  return topLevelCommentItems(root)
    .find((item) => commentId(item) === rootId)
    ?.parentElement || undefined;
}

function findNoteScroller(target: Element): HTMLElement | undefined {
  const explicit = target.querySelector<HTMLElement>('.note-scroller') ||
    target.closest<HTMLElement>('.note-scroller');
  if (explicit) return explicit;
  return [target, ...Array.from(target.querySelectorAll<HTMLElement>('*'))]
    .find((element): element is HTMLElement => (
      element instanceof HTMLElement && element.scrollHeight > element.clientHeight
    ));
}

function waitFor<T>(
  find: () => T | undefined,
  signal: AbortSignal,
  timeout = COMMENT_WAIT_MS,
): Promise<T | undefined> {
  const immediate = find();
  if (immediate !== undefined) return Promise.resolve(immediate);

  return new Promise((resolve) => {
    let settled = false;
    const finish = (value?: T) => {
      if (settled) return;
      settled = true;
      observer.disconnect();
      window.clearTimeout(timer);
      signal.removeEventListener('abort', handleAbort);
      resolve(value);
    };
    const inspect = () => {
      const value = find();
      if (value !== undefined) finish(value);
    };
    const handleAbort = () => finish();
    const observer = new MutationObserver(inspect);
    const timer = window.setTimeout(() => finish(), timeout);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    signal.addEventListener('abort', handleAbort, { once: true });
  });
}

function topLevelIds(root: ParentNode): Set<string> {
  return new Set(topLevelCommentItems(root)
    .map(commentId)
    .filter((id): id is string => Boolean(id)));
}

function replyIds(parent: Element): Set<string> {
  return new Set(replyCommentItems(parent)
    .map(commentId)
    .filter((id): id is string => Boolean(id)));
}

/** 小红书评论与正文共用滚动容器，Controller 只驱动原页并返回可序列化快照。 */
export class XiaohongshuCommentsController {
  private abortController?: AbortController;
  private requestPending = false;
  private replyRootId?: string;
  private replyTotal = 0;

  constructor(
    private readonly getTarget: () => Element | undefined,
    private readonly getTargetId: () => string | undefined,
  ) {}

  disconnect(): void {
    this.abortController?.abort();
    this.abortController = undefined;
    this.requestPending = false;
    this.replyRootId = undefined;
    this.replyTotal = 0;
  }

  request(command: CommentCommand): Promise<CommentRequestResult> {
    if (command.kind === 'closeReplies') {
      this.abortController?.abort();
      this.abortController = undefined;
      this.requestPending = false;
      this.replyRootId = undefined;
      this.replyTotal = 0;
      return Promise.resolve({ kind: 'closed' });
    }
    if (command.kind === 'closeAll') {
      this.disconnect();
      return Promise.resolve({ kind: 'closed' });
    }
    if (this.requestPending) {
      return Promise.resolve({ kind: 'failed', retryable: true });
    }
    if (command.targetId !== this.getTargetId() || !this.getTarget()) {
      return Promise.resolve({ kind: 'failed', retryable: false });
    }

    const controller = new AbortController();
    this.abortController = controller;
    this.requestPending = true;
    return this.perform(command, controller.signal).finally(() => {
      if (this.abortController === controller) {
        this.abortController = undefined;
        this.requestPending = false;
      }
    });
  }

  private async perform(
    command: Exclude<
      CommentCommand,
      { kind: 'closeReplies' } | { kind: 'closeAll' }
    >,
    signal: AbortSignal,
  ): Promise<CommentRequestResult> {
    if (command.kind === 'openPreview') return this.openComments(command.targetId, 'preview', signal);
    if (command.kind === 'openAll') return this.openComments(command.targetId, 'all', signal);
    if (command.kind === 'openReplies') {
      return this.openReplies(command.targetId, command.commentId);
    }
    if (this.replyRootId) return this.loadMoreReplies(command.targetId, signal);
    return this.loadMoreComments(command.targetId, signal);
  }

  private async openComments(
    targetId: string,
    scope: 'preview' | 'all',
    signal: AbortSignal,
  ): Promise<CommentRequestResult> {
    const target = this.getTarget();
    if (!target) return { kind: 'failed', retryable: false };
    const container = await waitFor(() => {
      const found = findCommentsContainer(target);
      if (!found) return undefined;
      const total = commentsTotal(found, 0);
      return topLevelCommentItems(found).length || total === 0 ? found : undefined;
    }, signal);
    if (!container || signal.aborted) return { kind: 'failed', retryable: true };
    return {
      kind: 'loaded',
      snapshot: parseXiaohongshuCommentSnapshot(container, targetId, scope),
    };
  }

  private openReplies(targetId: string, rootId: string): CommentRequestResult {
    const target = this.getTarget();
    const parent = target ? findParentComment(target, rootId) : undefined;
    if (!parent) return { kind: 'failed', retryable: true };
    const rootElement = Array.from(parent.children)
      .find((child) => child.matches('.comment-item:not(.comment-item-sub)'));
    if (!rootElement) return { kind: 'failed', retryable: true };
    const root = parseXiaohongshuComment(rootElement);
    this.replyRootId = rootId;
    this.replyTotal = root?.replyCount || replyCommentItems(parent).length;
    const snapshot = parseReplySnapshot(parent, targetId, rootId, this.replyTotal);
    return snapshot.hasMore
      ? { kind: 'loaded', snapshot }
      : { kind: 'exhausted', snapshot };
  }

  private async loadMoreReplies(
    targetId: string,
    signal: AbortSignal,
  ): Promise<CommentRequestResult> {
    const target = this.getTarget();
    const rootId = this.replyRootId;
    const parent = target && rootId ? findParentComment(target, rootId) : undefined;
    if (!parent || !rootId) return { kind: 'failed', retryable: true };
    const control = parent.querySelector<HTMLElement>('.reply-container > .show-more');
    if (!control || !/^展开/.test(normalizedText(control))) {
      return {
        kind: 'exhausted',
        snapshot: parseReplySnapshot(parent, targetId, rootId, this.replyTotal, true),
      };
    }

    const knownIds = replyIds(parent);
    control.click();
    const changed = await waitFor(() => {
      const ids = replyIds(parent);
      if (Array.from(ids).some((id) => !knownIds.has(id))) return true;
      const nextControl = parent.querySelector('.reply-container > .show-more');
      return !nextControl || !/^展开/.test(normalizedText(nextControl)) ? true : undefined;
    }, signal);
    if (signal.aborted) return { kind: 'failed', retryable: true };
    const snapshot = parseReplySnapshot(parent, targetId, rootId, this.replyTotal, !changed);
    return snapshot.hasMore
      ? { kind: 'loaded', snapshot }
      : { kind: 'exhausted', snapshot };
  }

  private async loadMoreComments(
    targetId: string,
    signal: AbortSignal,
  ): Promise<CommentRequestResult> {
    const target = this.getTarget();
    if (!target) return { kind: 'failed', retryable: false };
    const scroller = findNoteScroller(target);
    if (!scroller) {
      return {
        kind: 'exhausted',
        snapshot: parseXiaohongshuCommentSnapshot(target, targetId, 'all', true),
      };
    }

    const knownIds = topLevelIds(target);
    scroller.scrollTop = scroller.scrollHeight;
    scroller.dispatchEvent(new Event('scroll', { bubbles: true }));
    const added = await waitFor(() => {
      const ids = topLevelIds(target);
      return Array.from(ids).some((id) => !knownIds.has(id)) ? true : undefined;
    }, signal);
    if (signal.aborted) return { kind: 'failed', retryable: true };
    const snapshot = parseXiaohongshuCommentSnapshot(target, targetId, 'all', !added);
    return added
      ? { kind: 'loaded', snapshot }
      : { kind: 'exhausted', snapshot };
  }
}
