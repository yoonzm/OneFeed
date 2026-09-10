import md5 from 'blueimp-md5';
import { i18n } from '../../i18n';
import type { ArticleDetail } from '../../types/detail';
import type { FeedActionDescriptor, FeedBlock } from '../../types/feed';
import type { DetailAdapterDefinition, DetailListener } from './detail';
import { WEREAD_SOURCE } from './weread';

const READER_PATH_PATTERN = /^\/web\/reader\/([^/?#]+)\/?$/;
const CATALOG_ITEM_SELECTOR = '.readerCatalog_list_item';
const SELECTED_CATALOG_ITEM_SELECTOR = '.readerCatalog_list_item_selected';
const PRE_RENDER_CONTENT_SELECTOR = '.preRenderContent';
const SEMANTIC_CONTENT_SELECTOR = 'h1, h2, h3, h4, h5, h6, p, blockquote, li';
const PREVIOUS_PAGE_ACTION = 'previous-page';
const NEXT_PAGE_ACTION = 'next-page';
const INITIAL_STATE_PREFIX = 'window.__INITIAL_STATE__=';

type ChapterDirection = 'previous' | 'next';

interface WereadInitialState {
  reader?: {
    infoId?: string;
    currentChapter?: { chapterUid?: number };
    chapterInfos?: Array<{ chapterUid?: number }>;
  };
}

type ChapterNavigator = (url: URL, direction: ChapterDirection) => Promise<boolean>;

function normalizedText(element: Element | null): string {
  return element?.textContent?.replace(/\s+/g, ' ').trim() || '';
}

function documentTitle(root: ParentNode): string {
  return root instanceof Document ? root.title : document.title;
}

function encodeWereadId(value: string | number): string {
  const text = String(value);
  const digest = md5(text);
  const numeric = /^\d+$/.test(text);
  const chunks: string[] = [];

  if (numeric) {
    for (let index = 0; index < text.length; index += 9) {
      chunks.push(Number(text.slice(index, index + 9)).toString(16));
    }
  } else {
    chunks.push(Array.from({ length: text.length }, (_, index) => (
      text.charCodeAt(index).toString(16)
    )).join(''));
  }

  let encoded = `${digest.slice(0, 3)}${numeric ? '3' : '4'}2${digest.slice(-2)}`;
  encoded += chunks.map((chunk) => (
    `${chunk.length.toString(16).padStart(2, '0')}${chunk}`
  )).join('g');
  if (encoded.length < 20) encoded += digest.slice(0, 20 - encoded.length);
  return `${encoded}${md5(encoded).slice(0, 3)}`;
}

function parseInitialState(html: string): WereadInitialState | null {
  const stateStart = html.indexOf(INITIAL_STATE_PREFIX);
  if (stateStart < 0) return null;

  const jsonStart = stateStart + INITIAL_STATE_PREFIX.length;
  const scriptEnd = html.indexOf('</script>', jsonStart);
  if (scriptEnd < 0) return null;
  const assignment = html.slice(jsonStart, scriptEnd);
  const initializerEnd = assignment.indexOf(';(function()');
  const json = (initializerEnd >= 0 ? assignment.slice(0, initializerEnd) : assignment)
    .replace(/;\s*$/, '');

  try {
    return JSON.parse(json) as WereadInitialState;
  } catch {
    return null;
  }
}

export function resolveWereadChapterUrl(
  html: string,
  currentUrl: URL,
  direction: ChapterDirection,
): URL | null {
  const reader = parseInitialState(html)?.reader;
  const currentUid = reader?.currentChapter?.chapterUid;
  const chapters = reader?.chapterInfos || [];
  const currentIndex = chapters.findIndex((chapter) => chapter.chapterUid === currentUid);
  const targetIndex = currentIndex + (direction === 'previous' ? -1 : 1);
  const targetUid = chapters[targetIndex]?.chapterUid;
  const infoId = reader?.infoId || currentUrl.pathname.match(READER_PATH_PATTERN)?.[1] || '';
  const bookHash = infoId.split('k')[0];
  if (!bookHash || targetUid === undefined) return null;

  return new URL(`/web/reader/${bookHash}k${encodeWereadId(targetUid)}`, currentUrl.origin);
}

async function navigateWereadChapter(url: URL, direction: ChapterDirection): Promise<boolean> {
  const response = await fetch(url.href, { credentials: 'same-origin' });
  if (!response.ok) return false;
  const targetUrl = resolveWereadChapterUrl(await response.text(), url, direction);
  if (!targetUrl) return false;
  window.location.assign(targetUrl.href);
  return true;
}

function titlePartFromEnd(root: ParentNode, offset: number): string {
  const parts = documentTitle(root)
    .split(' - ')
    .map((part) => part.trim())
    .filter(Boolean);
  const platformOffset = parts.at(-1) === '微信读书' ? 1 : 0;
  return parts.at(-(offset + platformOffset)) || '';
}

function createDescriptionBlock(description: string, chapterTitle: string): FeedBlock | null {
  let bodyText = description.replace(/\s+/g, ' ').trim();
  // SSR 阶段的 description 是图书简介；章节正文就绪后才会以当前章节名开头。
  if (!bodyText.startsWith(`${chapterTitle} `)) return null;
  bodyText = bodyText.slice(chapterTitle.length).trim();
  if (!bodyText) return null;

  const cjkCount = bodyText.match(/[\u3400-\u9fff]/g)?.length || 0;
  const segments = cjkCount / bodyText.length > 0.25
    ? bodyText.split(/\s+/).filter(Boolean)
    : [bodyText];
  const container = document.createElement('div');

  segments.forEach((segment) => {
    const isHeading = segment.length <= 32 && !/[。！？.!?：:；;”’"）)]$/.test(segment);
    const element = document.createElement(isHeading ? 'h2' : 'p');
    element.textContent = segment;
    container.appendChild(element);
  });

  return {
    type: 'richText',
    html: container.innerHTML,
    plainText: bodyText,
  };
}

function createPreRenderBlock(root: ParentNode): FeedBlock | null {
  const source = root.querySelector(PRE_RENDER_CONTENT_SELECTOR);
  if (!source) return null;

  // 微信读书会短暂创建语义化 DOM，再用它绘制 Canvas。只重建受控标签和纯文本，
  // 避免把原站脚本、事件属性或样式带入 OneFeed 的文章详情。
  const elements = Array.from(source.querySelectorAll(SEMANTIC_CONTENT_SELECTOR))
    .filter((element) => {
      const semanticAncestor = element.parentElement?.closest(SEMANTIC_CONTENT_SELECTOR);
      return !semanticAncestor || !source.contains(semanticAncestor);
    });
  const container = document.createElement('div');
  const textSegments: string[] = [];

  elements.forEach((sourceElement) => {
    const text = normalizedText(sourceElement);
    if (!text) return;

    const tagName = /^H[1-6]$/.test(sourceElement.tagName)
      ? 'h2'
      : sourceElement.tagName === 'BLOCKQUOTE'
        ? 'blockquote'
        : 'p';
    const element = document.createElement(tagName);
    element.textContent = text;
    container.appendChild(element);
    textSegments.push(text);
  });

  if (textSegments.length === 0) return null;
  return {
    type: 'richText',
    html: container.innerHTML,
    plainText: textSegments.join('\n'),
  };
}

function findChapterTitle(root: ParentNode): string {
  return normalizedText(root.querySelector('.readerTopBar_title_chapter')) ||
    normalizedText(root.querySelector('.renderTargetPageInfo_header_chapterTitle')) ||
    normalizedText(root.querySelector(`${SELECTED_CATALOG_ITEM_SELECTOR} .readerCatalog_list_item_title_text`)) ||
    titlePartFromEnd(root, 2);
}

function withChapterHeading(block: FeedBlock, chapterTitle: string): FeedBlock[] {
  const container = document.createElement('div');
  if (block.type === 'richText') container.innerHTML = block.html;
  // 章节标题可能已包含在捕获的正文中；隐藏署名栏后，仅在缺失时补上标题。
  const hasHeading = Array.from(container.querySelectorAll('h1, h2, h3, h4, h5, h6'))
    .some((heading) => normalizedText(heading) === chapterTitle);
  if (hasHeading) return [block];

  const heading = document.createElement('h2');
  heading.textContent = chapterTitle;
  return [{ type: 'richText', html: heading.outerHTML, plainText: chapterTitle }, block];
}

function isEnabledButton(button: HTMLButtonElement | null): button is HTMLButtonElement {
  return Boolean(
    button &&
    !button.disabled &&
    button.getAttribute('aria-disabled') !== 'true' &&
    !button.classList.contains('disabled'),
  );
}

function findPreviousButton(root: ParentNode): HTMLButtonElement | null {
  return Array.from(root.querySelectorAll<HTMLButtonElement>('.readerHeaderButton'))
    .find((button) => normalizedText(button) === '上一章') || null;
}

function findNextButton(root: ParentNode): HTMLButtonElement | null {
  return Array.from(root.querySelectorAll<HTMLButtonElement>('.readerFooter_button'))
    .find((button) => (
      button.getAttribute('title') === '下一章' || normalizedText(button) === '下一章'
    )) || null;
}

function navigationAction(id: string, label: string): FeedActionDescriptor {
  return { id, kind: 'navigate', label, enabled: true };
}

export function isWereadDetailUrl(url: URL): boolean {
  return url.hostname === 'weread.qq.com' && READER_PATH_PATTERN.test(url.pathname);
}

/**
 * 微信读书把可见章节绘制到 Canvas，正文只会在绘制前短暂存在于语义化 DOM 中。
 * 部分图书也会把章节摘要同步到 description；两者都不存在时继续等待页面完成渲染。
 */
function parseWereadDetailContent(
  root: ParentNode,
  url: URL,
  bodyOverride?: FeedBlock,
): ArticleDetail | null {
  const bookId = url.pathname.match(READER_PATH_PATTERN)?.[1];
  if (!bookId) return null;

  const bookTitle = normalizedText(root.querySelector('.readerTopBar_title_link')) ||
    normalizedText(root.querySelector('.readerCatalog_bookInfo_title')) ||
    titlePartFromEnd(root, 3);
  const chapterTitle = findChapterTitle(root);
  const description = root.querySelector<HTMLMetaElement>('meta[name="description"]')
    ?.getAttribute('content') || '';
  const bodyBlock = bodyOverride ||
    createPreRenderBlock(root) ||
    createDescriptionBlock(description, chapterTitle);
  if (!bookTitle || !chapterTitle || !bodyBlock) return null;

  const catalogItems = Array.from(root.querySelectorAll(CATALOG_ITEM_SELECTOR));
  const selectedItem = root.querySelector(SELECTED_CATALOG_ITEM_SELECTOR);
  const selectedIndex = selectedItem ? catalogItems.indexOf(selectedItem) : -1;
  const currentPage = selectedIndex >= 0 ? selectedIndex + 1 : 1;
  const totalPages = Math.max(currentPage, catalogItems.length, 1);
  const previousButton = findPreviousButton(root);
  const nextButton = findNextButton(root);

  return {
    id: `weread_${bookId}`,
    platform: WEREAD_SOURCE.id,
    source: WEREAD_SOURCE,
    originalUrl: url.href,
    kind: 'article',
    role: 'article',
    title: bookTitle,
    author: false,
    metadataLabels: [chapterTitle],
    body: withChapterHeading(bodyBlock, chapterTitle),
    pagination: {
      currentPage,
      totalPages,
      previous: currentPage > 1 && isEnabledButton(previousButton)
        ? navigationAction(PREVIOUS_PAGE_ACTION, i18n.t('common.previousPage'))
        : undefined,
      next: currentPage < totalPages && isEnabledButton(nextButton)
        ? navigationAction(NEXT_PAGE_ACTION, i18n.t('common.nextPage'))
        : undefined,
    },
  };
}

export function parseWereadDetail(
  root: ParentNode,
  url = new URL(window.location.href),
): ArticleDetail | null {
  return parseWereadDetailContent(root, url);
}

export class WereadDetailAdapter {
  private observer?: MutationObserver;
  private timer?: number;
  private pendingTimer?: number;
  private itemId?: string;
  private lastRevision = '';
  private navigationPending = false;
  private preRenderSnapshot?: {
    bookId: string;
    chapterTitle: string;
    body: FeedBlock;
  };

  constructor(
    private readonly onDetail: DetailListener,
    private readonly getUrl = () => new URL(window.location.href),
    private readonly navigateChapter: ChapterNavigator = navigateWereadChapter,
  ) {}

  init(): void {
    this.observer = new MutationObserver(() => this.scheduleProcess());
    this.observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['aria-disabled', 'class', 'content', 'disabled', 'title'],
      childList: true,
      subtree: true,
    });
    this.processDetail();
  }

  disconnect(): void {
    this.observer?.disconnect();
    window.clearTimeout(this.timer);
    window.clearTimeout(this.pendingTimer);
    this.itemId = undefined;
    this.lastRevision = '';
    this.navigationPending = false;
    this.preRenderSnapshot = undefined;
  }

  triggerAction(itemId: string, actionId: string): boolean {
    if (itemId !== this.itemId) return false;
    if (this.navigationPending) return true;

    const button = actionId === PREVIOUS_PAGE_ACTION
      ? findPreviousButton(document)
      : actionId === NEXT_PAGE_ACTION
        ? findNextButton(document)
        : null;
    if (!isEnabledButton(button)) return false;

    this.navigationPending = true;
    const direction = actionId === PREVIOUS_PAGE_ACTION ? 'previous' : 'next';
    void this.navigateChapter(this.getUrl(), direction)
      .then((handled) => {
        if (handled) return;
        this.navigationPending = false;
        button.click();
      })
      .catch(() => {
        this.navigationPending = false;
        button.click();
      });
    window.clearTimeout(this.pendingTimer);
    this.pendingTimer = window.setTimeout(() => {
      this.navigationPending = false;
    }, 4_000);
    return true;
  }

  private scheduleProcess(): void {
    // 原站绘制 Canvas 时会持续修改 DOM；节流可保证解析不会被无限延后的尾触发防抖饿死。
    if (this.timer !== undefined) return;
    this.timer = window.setTimeout(() => {
      this.timer = undefined;
      this.processDetail();
    }, 120);
  }

  private processDetail(): void {
    const url = this.getUrl();
    const bookId = url.pathname.match(READER_PATH_PATTERN)?.[1];
    const chapterTitle = findChapterTitle(document);
    const preRenderBlock = createPreRenderBlock(document);

    if (this.preRenderSnapshot && this.preRenderSnapshot.bookId !== bookId) {
      this.preRenderSnapshot = undefined;
    }
    if (bookId && chapterTitle && preRenderBlock) {
      this.preRenderSnapshot = { bookId, chapterTitle, body: preRenderBlock };
    }

    // 绘制完成后正文节点会先于导航按钮消失。正文快照只可用于同一章节，
    // 这样既能继续发布迟到的按钮状态，也不会在翻页期间混用上一章正文。
    const cachedBody = bookId && chapterTitle &&
      this.preRenderSnapshot?.bookId === bookId &&
      this.preRenderSnapshot.chapterTitle === chapterTitle
      ? this.preRenderSnapshot.body
      : undefined;
    if (this.preRenderSnapshot?.bookId === bookId && !preRenderBlock && !cachedBody) return;

    const content = parseWereadDetailContent(document, url, preRenderBlock || cachedBody);
    if (!content) return;
    const bodyText = content.body[0]?.type === 'richText' ? content.body[0].plainText : '';
    const revision = [
      content.title,
      content.metadataLabels?.[0],
      content.pagination?.currentPage,
      content.pagination?.totalPages,
      content.pagination?.previous
        ? `${content.pagination.previous.id}:${content.pagination.previous.enabled}`
        : '',
      content.pagination?.next
        ? `${content.pagination.next.id}:${content.pagination.next.enabled}`
        : '',
      bodyText,
    ].join('\n');
    if (revision === this.lastRevision) return;

    this.lastRevision = revision;
    this.itemId = content.id;
    this.navigationPending = false;
    window.clearTimeout(this.pendingTimer);
    this.onDetail(content);
  }
}

export const wereadDetailAdapterDefinition: DetailAdapterDefinition = {
  source: WEREAD_SOURCE,
  surface: 'article',
  matches: isWereadDetailUrl,
  create: (onDetail) => new WereadDetailAdapter(onDetail),
};
