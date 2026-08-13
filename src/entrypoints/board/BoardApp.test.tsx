import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BoardApp } from './BoardApp';

describe('launch center', () => {
  let root: Root | undefined;
  const set = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('chrome', {
      runtime: { id: 'onefeed' },
      tabs: { create: vi.fn() },
      storage: {
        local: {
          get: vi.fn((defaults, callback) => callback(defaults)),
          set,
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
    set.mockClear();
    vi.unstubAllGlobals();
  });

  it('renders the approved information hierarchy and every supported platform once', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => root?.render(<BoardApp />));

    expect(container.querySelector('h1')?.textContent).toBe('继续上次的阅读。');
    expect(container.querySelector('.resume-platform strong')?.textContent).toBe('知乎');
    expect(container.querySelectorAll('.recent-row')).toHaveLength(2);
    expect(container.querySelectorAll('.more-card')).toHaveLength(5);
    expect(container.textContent).toContain('即将支持：哔哩哔哩 · YouTube');

    const platformLinks = [...container.querySelectorAll<HTMLAnchorElement>(
      '.resume-action, .recent-row, .more-card',
    )];
    expect(platformLinks).toHaveLength(8);
    expect(new Set(platformLinks.map((link) => link.href)).size).toBe(8);
  });

  it('persists the global enabled state from the header switch', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => root?.render(<BoardApp />));
    const enabledSwitch = container.querySelector<HTMLButtonElement>('[role="switch"]');

    expect(enabledSwitch?.getAttribute('aria-checked')).toBe('true');
    await act(async () => enabledSwitch?.click());

    expect(enabledSwitch?.getAttribute('aria-checked')).toBe('false');
    expect(set).toHaveBeenCalledWith({ enabled: false });
    expect(container.textContent).toContain('OneFeed 已暂停，打开网站后将显示原页面。');
  });
});
