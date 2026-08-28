import DOMPurify from 'dompurify';
import { i18n } from '../../i18n';
import type { ArticleDetail } from '../../types/detail';
import type { FeedBlock, FeedImage } from '../../types/feed';
import type { DetailAdapterDefinition, DetailListener } from './detail';
import {
  parseXiaohongshuCount,
  XIAOHONGSHU_SOURCE,
} from './xiaohongshu';

const DETAIL_ROOT_SELECTOR = '#noteContainer.note-container';
const SUPPORTED_HOSTS = new Set(['xiaohongshu.com', 'www.xiaohongshu.com']);

interface XiaohongshuImageData {
  url?: string;
  urlDefault?: string;
  urlPre?: string;
  width?: number;
  height?: number;
  infoList?: Array<{
    imageScene?: string;
    url?: string;
  }>;
}

interface XiaohongshuNoteData {
  noteId?: string;
  title?: string;
  desc?: string;
  type?: string;
  time?: number;
  lastUpdateTime?: number;
  imageList?: XiaohongshuImageData[];
  interactInfo?: {
    liked?: boolean;
    likedCount?: string;
    collected?: boolean;
    collectedCount?: string;
    commentCount?: string;
  };
  user?: {
    userId?: string;
    nickname?: string;
    avatar?: string;
  };
  video?: {
    capa?: {
      duration?: number;
    };
  };
}

interface XiaohongshuInitialState {
  note?: {
    currentNoteId?: string;
    noteDetailMap?: Record<string, {
      note?: XiaohongshuNoteData;
    }>;
  };
}

type RichTextBlock = Extract<FeedBlock, { type: 'richText' }>;

function detailNoteId(url: URL): string | undefined {
  return url.pathname.match(/^\/explore\/([0-9a-f]{24})\/?$/i)?.[1];
}

export function isXiaohongshuDetailUrl(url: URL): boolean {
  return SUPPORTED_HOSTS.has(url.hostname) && Boolean(detailNoteId(url));
}

function absoluteUrl(value: string, pageUrl: URL): string {
  if (!value) return '';
  try {
    const url = new URL(value, pageUrl);
    // 小红书的 SSR 数据仍可能返回 http CDN 地址，在 HTTPS 详情页中需要避免混合内容。
    if (pageUrl.protocol === 'https:' && url.protocol === 'http:' &&
      url.hostname.endsWith('.xhscdn.com')) {
      url.protocol = 'https:';
    }
    return url.href;
  } catch {
    return '';
  }
}

function normalizedText(element: Element | null | undefined): string {
  return element?.textContent?.replace(/\s+/g, ' ').trim() || '';
}

function metaValues(root: ParentNode, property: string): string[] {
  return Array.from(root.querySelectorAll<HTMLMetaElement>(
    `meta[property="${property}"]`,
  )).map((element) => element.content.trim()).filter(Boolean);
}

/** SSR 状态包含完整画廊；轮播 DOM 为节省资源通常只挂载当前图片。 */
function readInitialState(root: ParentNode): XiaohongshuInitialState | undefined {
  const marker = 'window.__INITIAL_STATE__=';
  const script = Array.from(root.querySelectorAll('script'))
    .find((candidate) => candidate.textContent?.includes(marker));
  const scriptText = script?.textContent || '';
  const start = scriptText.indexOf(marker);
  if (start < 0) return undefined;

  try {
    const json = scriptText
      .slice(start + marker.length)
      .trim()
      .replace(/;$/, '')
      .replace(/:\s*undefined(?=\s*[,}])/g, ':null');
    return JSON.parse(json) as XiaohongshuInitialState;
  } catch {
    return undefined;
  }
}

function readNoteData(root: ParentNode, noteId: string): XiaohongshuNoteData | undefined {
  const state = readInitialState(root)?.note;
  if (state?.currentNoteId !== noteId) return undefined;
  const note = state.noteDetailMap?.[noteId]?.note;
  return note?.noteId === noteId ? note : undefined;
}

function hasMatchingCanonical(root: ParentNode, url: URL, noteId: string): boolean {
  const values = [
    ...Array.from(root.querySelectorAll<HTMLLinkElement>('link[rel="canonical"]'))
      .map((element) => element.href),
    ...metaValues(root, 'og:url'),
  ];
  return values.some((value) => {
    try {
      return detailNoteId(new URL(value, url)) === noteId;
    } catch {
      return false;
    }
  });
}

/** 路由身份必须由 canonical 或同笔记 SSR 数据确认，避免 SPA 切换时发布旧详情。 */
export function findXiaohongshuDetailRoot(root: ParentNode, url: URL): Element | null {
  const noteId = detailNoteId(url);
  if (!noteId) return null;
  if (!hasMatchingCanonical(root, url, noteId) && !readNoteData(root, noteId)) return null;

  const element = root.querySelector(DETAIL_ROOT_SELECTOR);
  if (!element) return null;
  return element.querySelector('#detail-title, #detail-desc, .media-container')
    ? element
    : null;
}

function createDescriptionBlock(
  element: Element,
  pageUrl: URL,
  fallbackText = '',
): RichTextBlock | null {
  const source = element.querySelector('#detail-desc .note-text, #detail-desc');
  const container = document.createElement('div');
  if (source) {
    container.append(...Array.from(source.childNodes).map((node) => node.cloneNode(true)));
  } else if (fallbackText) {
    container.textContent = fallbackText.replace(/\[话题\]/g, '');
  }

  container.querySelectorAll('a[href]').forEach((link) => {
    const href = absoluteUrl(link.getAttribute('href') || '', pageUrl);
    if (!href) {
      link.removeAttribute('href');
      return;
    }
    link.setAttribute('href', href);
    link.setAttribute('target', '_blank');
    link.setAttribute('rel', 'noreferrer');
  });

  const html = DOMPurify.sanitize(container.innerHTML, {
    ALLOWED_TAGS: ['span', 'br', 'a'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  });
  const textContainer = document.createElement('div');
  textContainer.innerHTML = html;
  const plainText = normalizedText(textContainer);
  return plainText ? { type: 'richText', html, plainText } : null;
}

function imageDataUrl(image: XiaohongshuImageData, pageUrl: URL): string {
  const defaultImage = image.infoList?.find((candidate) => candidate.imageScene === 'WB_DFT');
  return absoluteUrl(
    image.urlDefault || defaultImage?.url || image.url || image.urlPre || '',
    pageUrl,
  );
}

function imageDimensions(widthValue: unknown, heightValue: unknown) {
  const width = Number(widthValue) || undefined;
  const height = Number(heightValue) || undefined;
  return {
    width,
    height,
    aspectRatio: width && height ? width / height : undefined,
  };
}

function detailImages(
  element: Element,
  note: XiaohongshuNoteData | undefined,
  pageUrl: URL,
  title: string,
): FeedImage[] {
  const stateImages = (note?.imageList || []).map((image) => ({
    url: imageDataUrl(image, pageUrl),
    alt: title,
    ...imageDimensions(image.width, image.height),
  })).filter((image) => Boolean(image.url));
  if (stateImages.length) return stateImages;

  const knownUrls = new Set<string>();
  return Array.from(element.querySelectorAll<HTMLImageElement>(
    '.media-container .note-slider-img img[src], .media-container img.ssr-first-image[src]',
  )).map((image) => ({
    url: absoluteUrl(image.getAttribute('src') || '', pageUrl),
    alt: image.getAttribute('alt') || title,
    ...imageDimensions(image.getAttribute('width'), image.getAttribute('height')),
  })).filter((image) => {
    if (!image.url || knownUrls.has(image.url)) return false;
    knownUrls.add(image.url);
    return true;
  });
}

function parseDuration(value: string): number | undefined {
  const parts = value.trim().split(':').map(Number);
  if (!parts.length || parts.some((part) => !Number.isFinite(part))) return undefined;
  return parts.reduce((total, part) => total * 60 + part, 0) || undefined;
}

function preferredMetaImage(root: ParentNode, pageUrl: URL): string {
  const values = metaValues(root, 'og:image');
  const preferred = values.find((value) => {
    try {
      return new URL(value, pageUrl).hostname.endsWith('.xhscdn.com');
    } catch {
      return false;
    }
  });
  return absoluteUrl(preferred || values.at(-1) || '', pageUrl);
}

function countFrom(...values: Array<string | number | undefined>): number {
  const value = values.find((candidate) => (
    candidate !== undefined && String(candidate).trim() !== ''
  ));
  return parseXiaohongshuCount(String(value ?? ''));
}

export function parseXiaohongshuDetail(
  element: Element,
  url = new URL(window.location.href),
  root: ParentNode = document,
): ArticleDetail | null {
  const noteId = detailNoteId(url);
  if (!noteId) return null;
  const note = readNoteData(root, noteId);
  const title = normalizedText(element.querySelector('#detail-title')) || note?.title?.trim() || '';
  const description = createDescriptionBlock(element, url, note?.desc);
  const images = detailImages(element, note, url, title);
  const isVideo = note?.type === 'video' || element.getAttribute('data-type') === 'video' ||
    metaValues(root, 'og:type').some((value) => value.startsWith('video'));

  const body: FeedBlock[] = description ? [description] : [];
  if (isVideo) {
    const videoElement = element.querySelector<HTMLVideoElement>('.media-container video');
    const poster = images[0]?.url || preferredMetaImage(root, url);
    const videoUrl = absoluteUrl(
      metaValues(root, 'og:video')[0] ||
        videoElement?.currentSrc ||
        videoElement?.getAttribute('src') ||
        '',
      url,
    );
    if (poster || videoUrl) {
      body.push({
        type: 'video',
        media: {
          poster,
          url: videoUrl || undefined,
          alt: title,
          durationSeconds: parseDuration(metaValues(root, 'og:videotime')[0] || '') ||
            note?.video?.capa?.duration,
          aspectRatio: images[0]?.aspectRatio,
        },
      });
    }
  } else if (images.length) {
    body.push({ type: 'gallery', items: images });
  }
  if (!body.length) return null;

  const authorLink = element.querySelector<HTMLAnchorElement>(
    '.author-container a.name[href], :scope > .author a.name[href]',
  );
  const avatar = element.querySelector<HTMLImageElement>(
    '.author-container img.avatar-item[src], :scope > .author img.avatar-item[src]',
  );
  const engageBar = element.querySelector('.engage-bar-container');
  const likeControl = engageBar?.querySelector<HTMLElement>('.like-wrapper');
  const collectControl = engageBar?.querySelector<HTMLElement>('.collect-wrapper');
  const reactions = countFrom(
    normalizedText(likeControl?.querySelector('.count')),
    metaValues(root, 'og:xhs:note_like')[0],
    note?.interactInfo?.likedCount,
  );
  const replies = countFrom(
    normalizedText(engageBar?.querySelector('.chat-wrapper .count')),
    metaValues(root, 'og:xhs:note_comment')[0],
    note?.interactInfo?.commentCount,
  );
  const bookmarks = countFrom(
    normalizedText(collectControl?.querySelector('.count')),
    metaValues(root, 'og:xhs:note_collect')[0],
    note?.interactInfo?.collectedCount,
  );
  const publishedAt = note?.time ||
    normalizedText(element.querySelector('.note-content .bottom-container .date')) ||
    undefined;
  const updatedAt = note?.lastUpdateTime && note.lastUpdateTime !== note.time
    ? note.lastUpdateTime
    : undefined;

  return {
    id: `xiaohongshu_${noteId}`,
    platform: 'xiaohongshu',
    source: XIAOHONGSHU_SOURCE,
    originalUrl: url.href,
    kind: 'article',
    role: 'post',
    title: title || undefined,
    author: {
      name: normalizedText(authorLink?.querySelector('.username')) ||
        normalizedText(authorLink) || note?.user?.nickname?.trim() || '',
      avatar: absoluteUrl(
        avatar?.getAttribute('src') || note?.user?.avatar || '',
        url,
      ),
      link: absoluteUrl(
        authorLink?.getAttribute('href') ||
          (note?.user?.userId ? `/user/profile/${note.user.userId}` : ''),
        url,
      ) || undefined,
    },
    publishedAt,
    updatedAt,
    body,
    actionSlots: {
      footer: {
        metrics: [
          { kind: 'reactions', value: reactions, label: i18n.t('adapter.like') },
          { kind: 'replies', value: replies, label: i18n.t('adapter.comments') },
        ],
        actions: [
          {
            id: 'react',
            kind: 'react',
            variant: 'like',
            label: i18n.t('adapter.like'),
            count: reactions,
            active: note?.interactInfo?.liked,
            enabled: Boolean(likeControl),
            fallback: 'openOriginal',
          },
          {
            id: 'bookmark',
            kind: 'bookmark',
            label: i18n.t('adapter.bookmark'),
            count: bookmarks,
            active: note?.interactInfo?.collected,
            enabled: Boolean(collectControl),
            fallback: 'openOriginal',
          },
        ],
      },
    },
  };
}

export function triggerXiaohongshuDetailAction(
  element: Element | undefined,
  actionId: string,
): boolean {
  const selector = actionId === 'react'
    ? '.engage-bar-container .like-wrapper'
    : actionId === 'bookmark'
      ? '.engage-bar-container .collect-wrapper'
      : undefined;
  if (!selector) return false;
  const control = element?.querySelector<HTMLElement>(selector);
  if (!control) return false;
  control.click();
  return true;
}

export class XiaohongshuDetailAdapter {
  private observer?: MutationObserver;
  private timer?: number;
  private runtimeElement?: Element;
  private itemId?: string;

  constructor(private readonly onDetail: DetailListener) {}

  init(): void {
    this.processDetail();
    this.observer = new MutationObserver(() => {
      window.clearTimeout(this.timer);
      this.timer = window.setTimeout(() => this.processDetail(), 120);
    });
    this.observer.observe(document.body, { childList: true, subtree: true });
  }

  disconnect(): void {
    this.observer?.disconnect();
    window.clearTimeout(this.timer);
    this.runtimeElement = undefined;
    this.itemId = undefined;
  }

  triggerAction(itemId: string, actionId: string): boolean {
    if (itemId !== this.itemId) return false;
    return triggerXiaohongshuDetailAction(this.runtimeElement, actionId);
  }

  private processDetail(): void {
    const url = new URL(window.location.href);
    const element = findXiaohongshuDetailRoot(document, url);
    if (!element) return;
    const content = parseXiaohongshuDetail(element, url);
    if (!content) return;

    this.runtimeElement = element;
    this.itemId = content.id;
    this.onDetail(content);
  }
}

export const xiaohongshuDetailAdapterDefinition: DetailAdapterDefinition = {
  source: XIAOHONGSHU_SOURCE,
  surface: 'article',
  matches: isXiaohongshuDetailUrl,
  create: (onDetail) => new XiaohongshuDetailAdapter(onDetail),
};
