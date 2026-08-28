import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getSupportedPlatforms } from '../../config/platforms';
import { FEED_FILTER_SETTINGS_KEY } from '../../filters/feedFilters';
import { DISPLAY_PREFERENCES_KEY } from '../../preferences/displayPreferences';
import { OptionsApp } from './OptionsApp';

describe('filter settings page', () => {
  let root: Root | undefined;
  let storedValues: Record<string, unknown>;

  beforeEach(() => {
    storedValues = {};
    vi.stubGlobal('chrome', {
      storage: {
        local: {
          get: vi.fn((defaults, callback) => callback({ ...defaults, ...storedValues })),
          set: vi.fn((values) => Object.assign(storedValues, values)),
        },
        onChanged: {
          addListener: vi.fn(),
          removeListener: vi.fn(),
        },
      },
    });
  });

  afterEach(async () => {
    if (root) await act(async () => root?.unmount());
    root = undefined;
    vi.unstubAllGlobals();
  });

  async function renderOptions() {
    const container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root?.render(<OptionsApp />);
      await Promise.resolve();
    });
    return container;
  }

  it('presents local filtering controls and every supported platform', async () => {
    const container = await renderOptions();

    expect(container.querySelector('a[href="/board.html"]')).toBeNull();
    expect(container.querySelector('.settings-intro')).toBeNull();
    expect(container.querySelector('.index-title h1')).not.toBeNull();
    expect(container.textContent).toContain('顶部常用网站');
    expect(container.querySelectorAll('.header-platform-row')).toHaveLength(
      getSupportedPlatforms().length,
    );
    expect(container.textContent).toContain('隐藏已读内容');
    expect(container.textContent).toContain('隐藏平台推荐');

    const create = Array.from(container.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('新建规则'));
    await act(async () => create?.click());

    expect(container.querySelectorAll('.platform-checks .platform-icon')).toHaveLength(0);
    const selectedScope = Array.from(container.querySelectorAll<HTMLInputElement>('input[type="radio"]'))
      .find((input) => !input.checked);
    await act(async () => selectedScope?.click());
    expect(container.querySelectorAll('.platform-checks .platform-icon')).toHaveLength(
      getSupportedPlatforms().length,
    );
  });

  it('persists the quick seen filter immediately', async () => {
    const container = await renderOptions();
    const toggle = container.querySelector<HTMLButtonElement>('[aria-label="隐藏已读内容"]');

    await act(async () => toggle?.click());

    expect(storedValues[FEED_FILTER_SETTINGS_KEY]).toMatchObject({ hideSeen: true });
    expect(toggle?.getAttribute('aria-checked')).toBe('true');
  });

  it('persists header visibility and custom platform order', async () => {
    const container = await renderOptions();
    const firstPlatform = getSupportedPlatforms()[0]!;
    const displayName = container.querySelector(
      `.header-platform-row[data-platform-id="${firstPlatform.id}"] .header-platform-name`,
    )?.textContent;
    const visibility = container.querySelector<HTMLButtonElement>(
      `.header-platform-row[data-platform-id="${firstPlatform.id}"] [role="switch"]`,
    );
    const moveDown = container.querySelector<HTMLButtonElement>(
      `.header-platform-row[data-platform-id="${firstPlatform.id}"] .move-down`,
    );

    expect(visibility?.getAttribute('aria-checked')).toBe('true');
    await act(async () => visibility?.click());
    expect(storedValues[DISPLAY_PREFERENCES_KEY]).toMatchObject({
      hiddenHeaderPlatformIds: [firstPlatform.id],
    });

    await act(async () => moveDown?.click());
    expect(
      (storedValues[DISPLAY_PREFERENCES_KEY] as { headerPlatformOrder: string[] })
        .headerPlatformOrder[1],
    ).toBe(firstPlatform.id);
    expect(displayName).toBeTruthy();
  });

  it('persists independent image visibility for feed and detail surfaces', async () => {
    const container = await renderOptions();
    const feedImages = container.querySelector<HTMLButtonElement>(
      '[aria-label="信息流列表显示图片"]',
    );
    const detailImages = container.querySelector<HTMLButtonElement>(
      '[aria-label="详情页显示图片"]',
    );

    expect(feedImages?.getAttribute('aria-checked')).toBe('true');
    expect(detailImages?.getAttribute('aria-checked')).toBe('true');
    await act(async () => feedImages?.click());
    await act(async () => detailImages?.click());

    expect(storedValues[DISPLAY_PREFERENCES_KEY]).toMatchObject({
      hideFeedImages: true,
      hideDetailImages: true,
    });
  });
});
