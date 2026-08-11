import type { DetailContent } from '../../types/detail';
import type { FeedSource } from '../../types/feed';
import { type AdapterDefinition, BaseAdapter, type FeedItemsListener } from './base';
import type { DetailAdapter, DetailAdapterDefinition } from './detail';
import { linuxDoAdapterDefinition } from './linuxDo';
import { linuxDoThreadAdapterDefinition } from './linuxDoThread';
import { twitterAdapterDefinition } from './twitter';
import { v2exAdapterDefinition } from './v2ex';
import { v2exThreadAdapterDefinition } from './v2exThread';
import { zhihuAdapterDefinition } from './zhihu';
import { zhihuDetailAdapterDefinition } from './zhihuDetail';
import { zhihuThreadAdapterDefinition } from './zhihuThread';

const feedAdapterDefinitions: AdapterDefinition[] = [
  zhihuAdapterDefinition,
  twitterAdapterDefinition,
  v2exAdapterDefinition,
  linuxDoAdapterDefinition,
];

const detailAdapterDefinitions: DetailAdapterDefinition[] = [
  zhihuThreadAdapterDefinition,
  v2exThreadAdapterDefinition,
  linuxDoThreadAdapterDefinition,
  zhihuDetailAdapterDefinition,
];

interface AdapterListeners {
  onFeedItems: FeedItemsListener;
  onDetail: (content: DetailContent) => void;
}

export type ActiveAdapter =
  | {
      surface: 'feed';
      adapter: BaseAdapter;
      source: FeedSource;
    }
  | {
      surface: 'article' | 'thread';
      adapter: DetailAdapter;
      source: FeedSource;
    };

export function createAdapter(url: URL, listeners: AdapterListeners): ActiveAdapter | null {
  const detailDefinition = detailAdapterDefinitions.find((candidate) => candidate.matches(url));
  if (detailDefinition) {
    return {
      surface: detailDefinition.surface,
      adapter: detailDefinition.create(listeners.onDetail),
      source: detailDefinition.source,
    };
  }

  const feedDefinition = feedAdapterDefinitions.find((candidate) => candidate.matches(url));
  if (!feedDefinition) return null;

  return {
    surface: 'feed',
    adapter: feedDefinition.create(listeners.onFeedItems),
    source: feedDefinition.source,
  };
}
