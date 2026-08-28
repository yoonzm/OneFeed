import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('settings page styles', () => {
  it('does not apply image description typography to the switch thumb', () => {
    const styles = readFileSync(resolve(process.cwd(), 'src/entrypoints/options/style.css'), 'utf8');

    expect(styles).not.toContain('.image-setting-row span');
    expect(styles).toContain('.image-setting-row > div > span');
  });
});
