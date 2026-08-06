import type { FeedAction, FeedItem, FeedSource } from '../../types/feed';

export type FeedItemsListener = (items: FeedItem[]) => void;

export interface AdapterDefinition {
  source: FeedSource;
  matches: (hostname: string) => boolean;
  create: (onItems: FeedItemsListener) => BaseAdapter;
}

export abstract class BaseAdapter {
  private observer?: MutationObserver;
  private timer?: number;

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
  }

  abstract parseCard(element: Element): FeedItem | null;
  abstract triggerAction(item: FeedItem, action: FeedAction): boolean;

  protected getCards(): Element[] {
    return Array.from(document.querySelectorAll(this.cardSelector));
  }

  private processCards(): void {
    const items = this.getCards()
      .map((card) => this.parseCard(card))
      .filter((item): item is FeedItem => item !== null);
    if (items.length) this.onItems(items);
  }
}
