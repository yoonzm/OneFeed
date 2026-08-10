import { describe, expect, it } from 'vitest';
import {
  compareChromeVersions,
  getHighestStoreVersion,
  parseChromeVersion,
} from './publish-chrome.mjs';

describe('Chrome Web Store version handling', () => {
  it('normalizes valid Chrome versions to four components', () => {
    expect(parseChromeVersion('0.1.2')).toEqual([0, 1, 2, 0]);
    expect(parseChromeVersion('3.1.2.4567')).toEqual([3, 1, 2, 4567]);
  });

  it.each(['01.2', '1.2.3.4.5', '1.65536', '1.beta'])('rejects invalid version %s', (version) => {
    expect(() => parseChromeVersion(version)).toThrow();
  });

  it('compares versions using Chrome ordering', () => {
    expect(compareChromeVersions('1.2.0', '1.1.65535')).toBe(1);
    expect(compareChromeVersions('1.0', '1.0.0.0')).toBe(0);
    expect(compareChromeVersions('0.9.9', '1.0')).toBe(-1);
  });

  it('finds the highest published or submitted version', () => {
    const status = {
      publishedItemRevisionStatus: {
        distributionChannels: [{ crxVersion: '0.1.0' }],
      },
      submittedItemRevisionStatus: {
        distributionChannels: [{ crxVersion: '0.2.0' }],
      },
    };

    expect(getHighestStoreVersion(status)).toBe('0.2.0');
  });
});
