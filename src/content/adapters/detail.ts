import type { DetailContent } from '../../types/detail';
import type { FeedSource } from '../../types/feed';
import type { CommentCommand, CommentRequestResult } from '../../types/comments';

export type DetailListener = (content: DetailContent) => void;

export interface DetailAdapter {
  init: () => void;
  disconnect: () => void;
  triggerAction: (itemId: string, actionId: string) => boolean;
  requestComments?: (command: CommentCommand) => Promise<CommentRequestResult>;
}

export interface DetailAdapterDefinition {
  source: FeedSource;
  surface: DetailContent['kind'];
  matches: (url: URL) => boolean;
  create: (onDetail: DetailListener) => DetailAdapter;
}
