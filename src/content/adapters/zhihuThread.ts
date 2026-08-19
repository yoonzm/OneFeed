import type { ThreadDetail, ThreadHeader } from '../../types/detail';
import type { ThreadEntry } from '../../types/feed';
import type { DetailAdapterDefinition, DetailListener } from './detail';
import {
  parseCount,
  parseZhihuBlocks,
  parseZhihuContent,
  triggerZhihuAction,
  ZHIHU_SOURCE,
} from './zhihu';

const ANSWER_SELECTOR = '.List-item .AnswerItem';

function firstText(root: ParentNode, selectors: string[]): string {
  for (const selector of selectors) {
    const text = root.querySelector(selector)?.textContent?.trim();
    if (text) return text;
  }
  return '';
}

export function isZhihuThreadUrl(url: URL): boolean {
  return ['zhihu.com', 'www.zhihu.com'].includes(url.hostname) &&
    /^\/question\/\d+\/?$/.test(url.pathname);
}

export function findZhihuThreadAnswerElements(root: ParentNode): Element[] {
  const listedAnswers = Array.from(root.querySelectorAll(ANSWER_SELECTOR));
  return listedAnswers.length
    ? listedAnswers
    : Array.from(root.querySelectorAll('.AnswerItem'));
}

export function parseZhihuThreadAnswer(element: Element): ThreadEntry | null {
  const parsed = parseZhihuContent(element);
  if (!parsed || parsed.role !== 'answer') return null;

  return {
    id: `zhihu_${parsed.originId}`,
    platform: 'zhihu',
    source: ZHIHU_SOURCE,
    originalUrl: parsed.originalUrl,
    kind: 'article',
    role: 'answer',
    author: parsed.author,
    publishedAt: parsed.publishedAt,
    updatedAt: parsed.updatedAt,
    body: parsed.blocks,
    metrics: parsed.metrics,
    actions: parsed.actions.map((action) => {
      if (action.kind === 'reply') {
        return { ...action, enabled: false, fallback: undefined };
      }
      if (action.kind === 'open') return { ...action, label: '查看详情' };
      return action;
    }),
  };
}

export function parseZhihuThread(
  root: ParentNode,
  url = new URL(window.location.href),
): ThreadDetail | null {
  const questionId = url.pathname.match(/^\/question\/(\d+)/)?.[1];
  const title = firstText(root, ['.QuestionHeader-title']);
  if (!questionId || !title) return null;

  const description = root.querySelector(
    '.QuestionHeader-detail .RichContent-inner, .QuestionHeader-detail .RichText, .QuestionRichText',
  );
  const answers = findZhihuThreadAnswerElements(root)
    .map(parseZhihuThreadAnswer)
    .filter((item): item is ThreadEntry => item !== null);
  const answerCount = parseCount(firstText(root, ['.List-headerText'])) || answers.length;
  const header: ThreadHeader = {
    id: `zhihu_question_${questionId}`,
    role: 'question',
    originalUrl: url.href,
    title,
    body: description ? parseZhihuBlocks(description) : [],
    metrics: [{ kind: 'replies', value: answerCount, label: '回答' }],
    actions: [{ id: 'open', kind: 'open', label: '查看原问题', enabled: true }],
  };

  return {
    id: header.id,
    platform: 'zhihu',
    source: ZHIHU_SOURCE,
    originalUrl: url.href,
    kind: 'thread',
    header,
    entries: answers,
    entryLabel: '回答',
    loadingMode: 'infinite',
  };
}

export class ZhihuThreadAdapter {
  private observer?: MutationObserver;
  private timer?: number;
  private readonly runtimeElements = new Map<string, Element>();

  constructor(private readonly onDetail: DetailListener) {}

  init(): void {
    this.processThread();
    this.observer = new MutationObserver(() => {
      window.clearTimeout(this.timer);
      this.timer = window.setTimeout(() => this.processThread(), 120);
    });
    this.observer.observe(document.body, { childList: true, subtree: true });
  }

  disconnect(): void {
    this.observer?.disconnect();
    window.clearTimeout(this.timer);
    this.runtimeElements.clear();
  }

  triggerAction(itemId: string, actionId: string): boolean {
    return triggerZhihuAction(this.runtimeElements.get(itemId), actionId);
  }

  private processThread(): void {
    const url = new URL(window.location.href);
    const content = parseZhihuThread(document, url);
    if (!content) return;

    this.runtimeElements.clear();
    findZhihuThreadAnswerElements(document).forEach((element) => {
      const item = parseZhihuThreadAnswer(element);
      if (item) this.runtimeElements.set(item.id, element);
    });
    this.onDetail(content);
  }
}

export const zhihuThreadAdapterDefinition: DetailAdapterDefinition = {
  source: ZHIHU_SOURCE,
  surface: 'thread',
  matches: isZhihuThreadUrl,
  create: (onDetail) => new ZhihuThreadAdapter(onDetail),
};
