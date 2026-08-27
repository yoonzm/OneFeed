import type { DetailContent } from '../../types/detail';
import type { FeedSource } from '../../types/feed';
import { type AdapterDefinition, BaseAdapter, type FeedItemsListener } from './base';
import type { DetailAdapter, DetailAdapterDefinition } from './detail';
import { hackerNewsAdapterDefinition } from './hackerNews';
import { linuxDoAdapterDefinition } from './linuxDo';
import { linuxDoThreadAdapterDefinition } from './linuxDoThread';
import { redditAdapterDefinition } from './reddit';
import { thirtySixKrAdapterDefinition } from './thirtySixKr';
import { thirtySixKrDetailAdapterDefinition } from './thirtySixKrDetail';
import { twitterAdapterDefinition } from './twitter';
import { v2exAdapterDefinition } from './v2ex';
import { v2exThreadAdapterDefinition } from './v2exThread';
import { weiboAdapterDefinition } from './weibo';
import { xiaohongshuAdapterDefinition } from './xiaohongshu';
import { zhihuAdapterDefinition } from './zhihu';
import { zhihuDetailAdapterDefinition } from './zhihuDetail';
import { zhihuThreadAdapterDefinition } from './zhihuThread';

const feedAdapterDefinitions: AdapterDefinition[] = [
  weiboAdapterDefinition,
  twitterAdapterDefinition,
  xiaohongshuAdapterDefinition,
  redditAdapterDefinition,
  zhihuAdapterDefinition,
  hackerNewsAdapterDefinition,
  linuxDoAdapterDefinition,
  v2exAdapterDefinition,
  thirtySixKrAdapterDefinition,
];

const detailAdapterDefinitions: DetailAdapterDefinition[] = [
  thirtySixKrDetailAdapterDefinition,
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

export function isSupportedUrl(url: URL): boolean {
  return detailAdapterDefinitions.some((candidate) => candidate.matches(url)) ||
    feedAdapterDefinitions.some((candidate) => candidate.matches(url));
}

/** 供平台目录一致性检查使用；每个已支持平台必须具备默认 Feed 入口。 */
export function getRegisteredPlatformIds(): string[] {
  return feedAdapterDefinitions.map((definition) => definition.source.id);
}

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
