import type {
  CommentCommand,
  CommentItem,
  CommentRequestResult,
  CommentSnapshot,
} from '../../types/comments';
import type { FeedMetric } from '../../types/feed';
import {
  parseCount,
  parseOrderedZhihuBlocks,
  triggerZhihuAction,
} from './zhihu';

const COMMENT_CONTAINER_SELECTOR = '.Comments-container';
const COMMENT_CONTENT_SELECTOR = '.CommentContent';
const COMMENT_MODAL_SELECTOR = '.Modal-content';
const PREVIEW_LIMIT = 10;
const COMMENT_WAIT_MS = 3000;

function normalizedText(element: Element | null): string {
  return element?.textContent?.replace(/[\s\u200b]+/g, ' ').trim() || '';
}

function commentItemRoots(root: ParentNode): Element[] {
  const knownIds = new Set<string>();
  return Array.from(root.querySelectorAll(COMMENT_CONTENT_SELECTOR))
    .map((content) => content.closest('[data-id]'))
    .filter((element): element is Element => {
      const id = element?.getAttribute('data-id')?.trim();
      if (!id || knownIds.has(id) || !root.contains(element)) return false;
      knownIds.add(id);
      return true;
    });
}

function ownedElements<T extends Element>(item: Element, selector: string): T[] {
  return Array.from(item.querySelectorAll<T>(selector))
    .filter((element) => element.closest('[data-id]') === item);
}

function parseCommentMetadata(item: Element, authorName: string): {
  publishedAt?: string;
  metadataLabels?: string[];
} {
  const labels = Array.from(new Set(
    ownedElements<HTMLElement>(item, 'time, [datetime], span')
      .map((element) => element.getAttribute('datetime') || normalizedText(element))
      .filter((label) => (
        label &&
        label !== authorName &&
        label !== '·' &&
        label.length <= 24 &&
        !/^\d+$/.test(label)
      )),
  ));
  const publishedAt = labels.find((label) => (
    /(?:刚刚|秒前|分钟?前|小时?前|天前|昨天|今天|\d{4}[-/.年]\d{1,2})/.test(label)
  ));
  const metadataLabels = labels
    .filter((label) => label !== publishedAt && !/^(?:回复|喜欢|赞)$/.test(label))
    .slice(0, 3);
  return {
    publishedAt,
    metadataLabels: metadataLabels.length ? metadataLabels : undefined,
  };
}

function parseZhihuComment(item: Element): CommentItem | null {
  const id = item.getAttribute('data-id')?.trim();
  const content = ownedElements<Element>(item, COMMENT_CONTENT_SELECTOR)[0];
  if (!id || !content) return null;

  const authorLink = ownedElements<HTMLAnchorElement>(item, 'a[href*="/people/"]')
    .find((link) => normalizedText(link));
  const avatar = ownedElements<HTMLImageElement>(item, 'img.Avatar')[0];
  const authorName = normalizedText(authorLink || null) || avatar?.alt?.trim() || '知乎用户';
  const parent = item.parentElement?.closest('[data-id]');
  const buttons = ownedElements<HTMLButtonElement>(item, 'button, [role="button"]');
  const reactionButton = buttons.find((button) => (
    Boolean(button.querySelector('svg[class*="Heart"]')) ||
    /(?:喜欢|赞)/.test(normalizedText(button))
  ));
  const reactions = parseCount(normalizedText(reactionButton || null));
  const replyCount = Math.max(0, ...buttons
    .filter((button) => /(?:查看全部|展开其他).*回复/.test(normalizedText(button)))
    .map((button) => parseCount(normalizedText(button))));
  const metrics: FeedMetric[] = reactions
    ? [{ kind: 'reactions', value: reactions, label: '赞' }]
    : [];

  return {
    id,
    parentId: parent && item.contains(parent) === false ? parent.getAttribute('data-id') || undefined : undefined,
    author: {
      name: authorName,
      avatar: avatar?.src || '',
      link: authorLink?.href || undefined,
    },
    body: parseOrderedZhihuBlocks(content),
    ...parseCommentMetadata(item, authorName),
    metrics,
    replyCount: replyCount || undefined,
  };
}

function commentTotal(root: ParentNode, fallback: number): number {
  const match = normalizedText(root instanceof Element ? root : null)
    .match(/([\d,.]+\s*[万千]?)\s*条评论/);
  return match?.[1] ? parseCount(match[1]) : fallback;
}

function findScrollable(root: Element): HTMLElement | undefined {
  const candidates = [root, ...Array.from(root.querySelectorAll<HTMLElement>('*'))]
    .filter((element): element is HTMLElement => element instanceof HTMLElement);
  return candidates.find((element) => {
    const overflowY = window.getComputedStyle(element).overflowY;
    return /(?:auto|scroll)/.test(overflowY) && element.scrollHeight > element.clientHeight;
  }) || candidates.find((element) => element.scrollHeight > element.clientHeight);
}

function parseSnapshot(
  root: Element,
  targetId: string,
  scope: CommentSnapshot['scope'],
  forceExhausted = false,
): CommentSnapshot {
  const items = commentItemRoots(root)
    .map(parseZhihuComment)
    .filter((item): item is CommentItem => item !== null && item.body.length > 0);
  const total = commentTotal(root, items.filter((item) => !item.parentId).length);
  const scroller = scope === 'all' ? findScrollable(root) : undefined;
  const canScroll = Boolean(
    scroller && scroller.scrollTop + scroller.clientHeight < scroller.scrollHeight - 2,
  );
  return {
    targetId,
    scope,
    total,
    items,
    hasMore: forceExhausted ? false : scope === 'all' && (
      canScroll || (!scroller && items.length < total)
    ),
  };
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

/** 知乎会先插入评论骨架再补作者等字段，等待一个短暂无变更窗口后再取快照。 */
function waitForDomSettled(
  root: Element,
  signal: AbortSignal,
  quietTime = 160,
  maximumWait = 1200,
): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    let quietTimer: number;
    const finish = () => {
      if (settled) return;
      settled = true;
      observer.disconnect();
      window.clearTimeout(quietTimer);
      window.clearTimeout(maximumTimer);
      signal.removeEventListener('abort', finish);
      resolve();
    };
    const schedule = () => {
      window.clearTimeout(quietTimer);
      quietTimer = window.setTimeout(finish, quietTime);
    };
    const observer = new MutationObserver(schedule);
    const maximumTimer = window.setTimeout(finish, maximumWait);
    observer.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
    });
    signal.addEventListener('abort', finish, { once: true });
    schedule();
  });
}

function findPreviewContainer(target: Element): Element | undefined {
  return Array.from(target.querySelectorAll(COMMENT_CONTAINER_SELECTOR))
    .find((container) => (
      Boolean(container.querySelector(COMMENT_CONTENT_SELECTOR)) ||
      /0\s*条评论/.test(normalizedText(container))
    ));
}

function currentModals(): Element[] {
  return Array.from(document.querySelectorAll(COMMENT_MODAL_SELECTOR))
    .filter((modal) => Boolean(modal.querySelector(COMMENT_CONTENT_SELECTOR)));
}

function modalCommentIds(modal: Element): Set<string> {
  return new Set(commentItemRoots(modal).map((item) => item.getAttribute('data-id') || ''));
}

function findMatchingModal(previewIds: Set<string>): Element | undefined {
  const modals = currentModals();
  if (!previewIds.size) return modals.length === 1 ? modals[0] : undefined;
  return modals.find((modal) => {
    const ids = modalCommentIds(modal);
    return Array.from(previewIds).some((id) => ids.has(id));
  });
}

function findAllCommentsControl(target: Element): HTMLElement | undefined {
  const preview = target.querySelector(COMMENT_CONTAINER_SELECTOR);
  const roots = preview ? [preview, target] : [target];
  for (const root of roots) {
    const control = Array.from(root.querySelectorAll<HTMLElement>(
      'button, [role="button"], div',
    ))
      .find((candidate) => {
        const label = normalizedText(candidate);
        if (!/^(?:点击)?查看全部.*评论$/.test(label) || /回复/.test(label)) return false;
        return candidate.matches('button, [role="button"]') ||
          Boolean(candidate.querySelector('svg')) ||
          window.getComputedStyle(candidate).cursor === 'pointer';
      });
    if (control) return control;
  }
  return undefined;
}

function findCloseControl(modal: Element): HTMLElement | undefined {
  let root: Element = modal;
  for (let depth = 0; depth < 4 && root.parentElement; depth += 1) {
    root = root.parentElement;
  }
  return root.querySelector<HTMLElement>([
    '.Modal-closeButton',
    'button[aria-label*="关闭"]',
    '[role="button"][aria-label*="关闭"]',
  ].join(', ')) || undefined;
}

/** 只持有知乎评论运行时节点，返回给 Renderer 的始终是可序列化快照。 */
export class ZhihuCommentsController {
  private modal?: Element;
  private abortController?: AbortController;
  private requestPending = false;
  private readonly previewIds = new Set<string>();

  constructor(
    private readonly getTarget: () => Element | undefined,
    private readonly getTargetId: () => string | undefined,
  ) {}

  disconnect(): void {
    this.abortController?.abort();
    this.abortController = undefined;
    this.requestPending = false;
    this.modal = undefined;
    this.previewIds.clear();
  }

  request(command: CommentCommand): Promise<CommentRequestResult> {
    if (command.kind === 'closeAll') {
      this.abortController?.abort();
      this.abortController = undefined;
      this.requestPending = false;
      if (this.modal?.isConnected) findCloseControl(this.modal)?.click();
      this.modal = undefined;
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
    const request = this.perform(command, controller.signal);
    return request.finally(() => {
      if (this.abortController === controller) {
        this.abortController = undefined;
        this.requestPending = false;
      }
    });
  }

  private async perform(
    command: Exclude<CommentCommand, { kind: 'closeAll' }>,
    signal: AbortSignal,
  ): Promise<CommentRequestResult> {
    if (command.kind === 'openPreview') return this.openPreview(command.targetId, signal);
    if (command.kind === 'openAll') return this.openAll(command.targetId, signal);
    return this.loadMore(command.targetId, signal);
  }

  private async openPreview(
    targetId: string,
    signal: AbortSignal,
  ): Promise<CommentRequestResult> {
    const target = this.getTarget();
    if (!target) return { kind: 'failed', retryable: false };
    let preview = findPreviewContainer(target);
    if (!preview) {
      const existingModals = new Set(currentModals());
      if (!triggerZhihuAction(target, 'reply')) {
        return { kind: 'failed', retryable: false };
      }
      const found = await waitFor(() => {
        const container = findPreviewContainer(target);
        if (container) return { preview: container };
        const modal = currentModals().find((candidate) => !existingModals.has(candidate));
        return modal ? { modal } : undefined;
      }, signal);
      if (!found || signal.aborted) return { kind: 'failed', retryable: true };
      preview = found.preview;
      if (found.modal) this.modal = found.modal;
    }

    const source = preview || this.modal;
    if (!source) return { kind: 'failed', retryable: true };
    await waitForDomSettled(source, signal);
    if (signal.aborted) return { kind: 'failed', retryable: true };
    const parsed = parseSnapshot(source, targetId, 'preview');
    const snapshot = this.modal
      ? { ...parsed, items: parsed.items.slice(0, PREVIEW_LIMIT), hasMore: parsed.total > PREVIEW_LIMIT }
      : parsed;
    this.previewIds.clear();
    snapshot.items.forEach((item) => this.previewIds.add(item.id));
    return { kind: 'loaded', snapshot };
  }

  private async openAll(
    targetId: string,
    signal: AbortSignal,
  ): Promise<CommentRequestResult> {
    const target = this.getTarget();
    if (!target) return { kind: 'failed', retryable: false };
    if (!this.modal?.isConnected) {
      this.modal = findMatchingModal(this.previewIds);
    }
    if (!this.modal) {
      const control = findAllCommentsControl(target);
      if (!control) return { kind: 'failed', retryable: true };
      const existingModals = new Set(currentModals());
      control.click();
      this.modal = await waitFor(
        () => currentModals().find((candidate) => !existingModals.has(candidate)),
        signal,
      );
    }
    if (!this.modal || signal.aborted) return { kind: 'failed', retryable: true };
    await waitForDomSettled(this.modal, signal);
    if (signal.aborted) return { kind: 'failed', retryable: true };
    return { kind: 'loaded', snapshot: parseSnapshot(this.modal, targetId, 'all') };
  }

  private async loadMore(
    targetId: string,
    signal: AbortSignal,
  ): Promise<CommentRequestResult> {
    if (!this.modal?.isConnected) return { kind: 'failed', retryable: true };
    const scroller = findScrollable(this.modal);
    if (!scroller) {
      return { kind: 'exhausted', snapshot: parseSnapshot(this.modal, targetId, 'all', true) };
    }
    const knownIds = modalCommentIds(this.modal);
    scroller.scrollTop = scroller.scrollHeight;
    scroller.dispatchEvent(new Event('scroll', { bubbles: true }));
    const added = await waitFor(() => {
      const ids = modalCommentIds(this.modal!);
      return Array.from(ids).some((id) => !knownIds.has(id)) ? true : undefined;
    }, signal);
    if (signal.aborted) return { kind: 'failed', retryable: true };
    if (added) await waitForDomSettled(this.modal, signal);
    if (signal.aborted) return { kind: 'failed', retryable: true };
    const snapshot = parseSnapshot(this.modal, targetId, 'all', !added);
    return added
      ? { kind: 'loaded', snapshot }
      : { kind: 'exhausted', snapshot };
  }
}
