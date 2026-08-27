import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import enMessages from '../../locales/en.json';
import { createTestI18n, i18n } from '../../test/i18n';

describe('launch center localization', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('renders the launch center and platform names in English', async () => {
    const english = createTestI18n(enMessages);
    vi.spyOn(i18n, 't').mockImplementation(english.t);
    const { BoardApp } = await import('./BoardApp');

    const markup = renderToStaticMarkup(<BoardApp />);

    expect(markup).toContain('Continue where you left off.');
    expect(markup).toContain('Open Zhihu');
    expect(markup).toContain('Coming soon: X · Weibo · Xiaohongshu · Reddit · Bilibili · YouTube');
    expect(markup).not.toContain('继续上次的阅读');
  }, 30_000);
});
