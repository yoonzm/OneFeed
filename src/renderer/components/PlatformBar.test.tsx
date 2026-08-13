import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PlatformBar } from './PlatformBar';

describe('PlatformBar feed channels', () => {
  let root: Root | undefined;

  afterEach(async () => {
    if (root) await act(async () => root?.unmount());
    root = undefined;
  });

  it('opens the channel menu beside the active platform and delegates selection', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const scrollElement = document.createElement('div');
    const scrollTo = vi.fn();
    scrollElement.scrollTo = scrollTo;
    const onFeedChannelSelect = vi.fn(() => true);
    root = createRoot(container);

    await act(async () => root?.render(
      <PlatformBar
        activePlatformId="zhihu"
        channels={[
          { id: 'recommend', label: '推荐', active: true },
          { id: 'hot', label: '热榜', active: false },
        ]}
        surface="feed"
        scrollElement={scrollElement}
        colorScheme="light"
        themeReady
        onColorSchemeChange={vi.fn()}
        onFeedChannelSelect={onFeedChannelSelect}
      />,
    ));

    const trigger = container.querySelector<HTMLButtonElement>(
      'button[aria-label="切换知乎频道，当前推荐"]',
    );
    expect(trigger).not.toBeNull();
    await act(async () => trigger?.click());

    const hot = Array.from(container.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]'))
      .find((button) => button.textContent?.includes('热榜'));
    expect(hot).toBeDefined();
    await act(async () => hot?.click());

    expect(onFeedChannelSelect).toHaveBeenCalledWith('hot');
    expect(container.querySelector('[role="menu"]')).toBeNull();
    expect(scrollTo).not.toHaveBeenCalled();
  });
});
