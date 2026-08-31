import { describe, expect, it } from 'vitest';
import { getSupportedPlatforms } from '../config/platforms';
import {
  DEFAULT_DISPLAY_PREFERENCES,
  getHeaderPlatforms,
  normalizeDisplayPreferences,
} from './displayPreferences';

describe('display preferences', () => {
  it('shows every supported platform and all content images by default', () => {
    expect(DEFAULT_DISPLAY_PREFERENCES).toEqual({
      version: 1,
      headerPlatformOrder: getSupportedPlatforms().map((platform) => platform.id),
      hiddenHeaderPlatformIds: [],
      hideFeedImages: false,
      hideDetailImages: false,
    });
  });

  it('normalizes platform order while preserving hidden choices', () => {
    const preferences = normalizeDisplayPreferences({
      headerPlatformOrder: ['zhihu', 'twitter', 'zhihu', 'unknown'],
      hiddenHeaderPlatformIds: ['twitter', 'unknown', 'twitter'],
      hideFeedImages: true,
      hideDetailImages: true,
    });

    expect(preferences.headerPlatformOrder.slice(0, 2)).toEqual(['zhihu', 'twitter']);
    expect(preferences.headerPlatformOrder).toHaveLength(getSupportedPlatforms().length);
    expect(preferences.hiddenHeaderPlatformIds).toEqual(['twitter']);
    expect(preferences.hideFeedImages).toBe(true);
    expect(preferences.hideDetailImages).toBe(true);
  });

  it('keeps the current platform available even when it is hidden in settings', () => {
    const platforms = getHeaderPlatforms({
      ...DEFAULT_DISPLAY_PREFERENCES,
      hiddenHeaderPlatformIds: ['zhihu', 'twitter'],
    }, 'zhihu');

    expect(platforms[0]?.id).toBe('zhihu');
    expect(platforms.some((platform) => platform.id === 'twitter')).toBe(false);
  });
});
