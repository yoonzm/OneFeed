import { getSupportedPlatforms, type PlatformId } from '../../config/platforms';

export const DEFAULT_RECENT_PLATFORM_IDS: PlatformId[] = [
  'zhihu',
  'hacker-news',
  'v2ex',
];

const supportedPlatformIds = new Set(
  getSupportedPlatforms().map((platform) => platform.id),
);

function isSupportedPlatformId(value: unknown): value is PlatformId {
  return typeof value === 'string' && supportedPlatformIds.has(value);
}

/** 本地记录可能来自旧版本或手工修改，进入界面前先去重并剔除失效平台。 */
export function normalizeRecentPlatformIds(value: unknown): PlatformId[] {
  if (!Array.isArray(value)) return [...DEFAULT_RECENT_PLATFORM_IDS];

  const normalized = value
    .filter(isSupportedPlatformId)
    .filter((id, index, ids) => ids.indexOf(id) === index)
    .slice(0, 3);

  return normalized.length ? normalized : [...DEFAULT_RECENT_PLATFORM_IDS];
}

export function movePlatformToRecent(
  current: readonly PlatformId[],
  selected: PlatformId,
): PlatformId[] {
  return [selected, ...current.filter((id) => id !== selected)].slice(0, 3);
}
