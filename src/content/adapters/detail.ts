import type { DetailContent } from '../../types/detail';
import type { FeedSource } from '../../types/feed';

export type DetailListener = (content: DetailContent) => void;

export interface DetailAdapter {
  init: () => void;
  disconnect: () => void;
  triggerAction: (itemId: string, actionId: string) => boolean;
}

export interface DetailAdapterDefinition {
  source: FeedSource;
  surface: DetailContent['kind'];
  matches: (url: URL) => boolean;
  create: (onDetail: DetailListener) => DetailAdapter;
}
