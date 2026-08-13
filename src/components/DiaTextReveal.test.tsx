import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DiaTextReveal } from './DiaTextReveal';

describe('DiaTextReveal', () => {
  let root: Root | undefined;

  afterEach(async () => {
    if (root) await act(async () => root?.unmount());
    root = undefined;
    vi.unstubAllGlobals();
  });

  it('settles immediately on the theme foreground when motion is reduced', async () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })));
    const container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => root?.render(<DiaTextReveal text="OneFeed" />));

    const text = container.querySelector<HTMLElement>('span');
    expect(text?.textContent).toBe('OneFeed');
    expect(text?.style.backgroundImage).toBe(
      'linear-gradient(90deg, var(--color-onefeed-ink, var(--ink, #172033)), var(--color-onefeed-ink, var(--ink, #172033)))',
    );
  });
});
