import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readStyle = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('global theme tokens', () => {
  it('owns the shared shadcn colors and Geist font in one raw token file', () => {
    const tokens = readStyle('src/styles/theme-tokens.css');

    expect(tokens).toContain('--onefeed-paper: #fafafa');
    expect(tokens).toContain('--onefeed-surface: #ffffff');
    expect(tokens).toContain('--onefeed-ink: #0a0a0a');
    expect(tokens).toContain('--onefeed-surface: #171717');
    expect(tokens).toContain('--onefeed-ink: #fafafa');
    expect(tokens).toContain('--onefeed-font-sans: "Geist Variable"');
  });

  it('keeps the settings page free of private global color and font overrides', () => {
    const optionsStyles = readStyle('src/entrypoints/options/style.css');

    expect(optionsStyles).not.toMatch(/--color-onefeed-(paper|surface|ink):/);
    expect(optionsStyles).not.toContain('@fontsource-variable/geist');
  });
});
