import {
  getPlatformById,
  getSupportedPlatforms,
  type PlatformDefinition,
  type PlatformId,
} from '../config/platforms';

export const DISPLAY_PREFERENCES_KEY = 'onefeed.displayPreferences.v1';

export interface DisplayPreferences {
  version: 1;
  headerPlatformOrder: PlatformId[];
  hiddenHeaderPlatformIds: PlatformId[];
  hideFeedImages: boolean;
  hideDetailImages: boolean;
}

const supportedPlatformIds = getSupportedPlatforms().map((platform) => platform.id as PlatformId);
const supportedPlatformIdSet = new Set<PlatformId>(supportedPlatformIds);

export const DEFAULT_DISPLAY_PREFERENCES: DisplayPreferences = {
  version: 1,
  headerPlatformOrder: [...supportedPlatformIds],
  hiddenHeaderPlatformIds: [],
  hideFeedImages: false,
  hideDetailImages: false,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizePlatformIds(value: unknown): PlatformId[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((entry): entry is PlatformId => (
    typeof entry === 'string' && supportedPlatformIdSet.has(entry as PlatformId)
  )))];
}

export function normalizeDisplayPreferences(value: unknown): DisplayPreferences {
  if (!isRecord(value)) {
    return {
      ...DEFAULT_DISPLAY_PREFERENCES,
      headerPlatformOrder: [...DEFAULT_DISPLAY_PREFERENCES.headerPlatformOrder],
      hiddenHeaderPlatformIds: [],
    };
  }

  const storedOrder = normalizePlatformIds(value.headerPlatformOrder);
  const knownOrder = new Set(storedOrder);
  return {
    version: 1,
    // New adapters join the end of an existing custom order instead of disappearing silently.
    headerPlatformOrder: [
      ...storedOrder,
      ...supportedPlatformIds.filter((id) => !knownOrder.has(id)),
    ],
    hiddenHeaderPlatformIds: normalizePlatformIds(value.hiddenHeaderPlatformIds),
    hideFeedImages: value.hideFeedImages === true,
    hideDetailImages: value.hideDetailImages === true,
  };
}

export function getHeaderPlatforms(
  preferences: DisplayPreferences,
  activePlatformId: string,
): PlatformDefinition[] {
  const hiddenIds = new Set(preferences.hiddenHeaderPlatformIds);
  const visibleIds = preferences.headerPlatformOrder.filter((id) => !hiddenIds.has(id));
  const activePlatform = getPlatformById(activePlatformId);

  // A hidden current platform remains available for context and same-site channel controls.
  if (
    activePlatform?.status === 'supported' &&
    !visibleIds.includes(activePlatform.id as PlatformId)
  ) {
    visibleIds.unshift(activePlatform.id as PlatformId);
  }

  return visibleIds
    .map((id) => getPlatformById(id))
    .filter((platform): platform is PlatformDefinition => platform !== undefined);
}
