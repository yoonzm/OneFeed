import type { FeedSource } from '../../types/feed';
import { type AdapterDefinition, BaseAdapter, type FeedItemsListener } from './base';
import { twitterAdapterDefinition } from './twitter';
import { zhihuAdapterDefinition } from './zhihu';

const adapterDefinitions: AdapterDefinition[] = [
  zhihuAdapterDefinition,
  twitterAdapterDefinition,
];

export interface ActiveAdapter {
  adapter: BaseAdapter;
  source: FeedSource;
}

export function createAdapter(
  hostname: string,
  onItems: FeedItemsListener,
): ActiveAdapter | null {
  const definition = adapterDefinitions.find((candidate) => candidate.matches(hostname));
  if (!definition) return null;

  return {
    adapter: definition.create(onItems),
    source: definition.source,
  };
}
