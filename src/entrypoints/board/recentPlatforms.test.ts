import { describe, expect, it } from 'vitest';
import {
  DEFAULT_RECENT_PLATFORM_IDS,
  movePlatformToRecent,
  normalizeRecentPlatformIds,
} from './recentPlatforms';

describe('launch-center recency', () => {
  it('keeps only unique supported platform ids', () => {
    expect(normalizeRecentPlatformIds([
      'reddit',
      'reddit',
      'unknown',
      'zhihu',
      'twitter',
      'v2ex',
    ])).toEqual(['reddit', 'zhihu', 'twitter']);
  });

  it('falls back to a useful default when storage is missing or invalid', () => {
    expect(normalizeRecentPlatformIds(undefined)).toEqual(DEFAULT_RECENT_PLATFORM_IDS);
    expect(normalizeRecentPlatformIds([])).toEqual(DEFAULT_RECENT_PLATFORM_IDS);
  });

  it('moves the selected platform to the front and limits history to three', () => {
    expect(movePlatformToRecent(['zhihu', 'v2ex', 'reddit'], 'v2ex')).toEqual([
      'v2ex',
      'zhihu',
      'reddit',
    ]);
    expect(movePlatformToRecent(['zhihu', 'v2ex', 'reddit'], 'twitter')).toEqual([
      'twitter',
      'zhihu',
      'v2ex',
    ]);
  });
});
