import type { FeedItem, FeedSource } from '../../types/feed';

export type FeedItemsListener = (items: FeedItem[]) => void;

export interface AdapterDefinition {
  source: FeedSource;
  matches: (url: URL) => boolean;
  create: (onItems: FeedItemsListener) => BaseAdapter;
}

export abstract class BaseAdapter {
  private observer?: MutationObserver;
  private timer?: number;
  private readonly runtimeElements = new Map<string, Element>();

  protected abstract readonly cardSelector: string;

  constructor(private readonly onItems: FeedItemsListener) {}

  init(): void {
    this.processCards();
    this.observer = new MutationObserver(() => {
      window.clearTimeout(this.timer);
      this.timer = window.setTimeout(() => this.processCards(), 120);
    });
    this.observer.observe(document.body, { childList: true, subtree: true });
  }

  disconnect(): void {
    this.observer?.disconnect();
    window.clearTimeout(this.timer);
    this.runtimeElements.clear();
  }

  abstract parseCard(element: Element): FeedItem | null;
  abstract triggerAction(itemId: string, actionId: string): boolean;

  protected getCards(): Element[] {
    return Array.from(document.querySelectorAll(this.cardSelector));
  }

  protected getRuntimeElement(itemId: string): Element | undefined {
    return this.runtimeElements.get(itemId);
  }

  private processCards(): void {
    const items = this.getCards()
      .map((card) => {
        const item = this.parseCard(card);
        if (item) this.runtimeElements.set(item.id, card);
        return item;
      })
      .filter((item): item is FeedItem => item !== null);
    if (items.length) this.onItems(items);
  }
}
