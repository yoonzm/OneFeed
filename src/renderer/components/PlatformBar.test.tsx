import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getSupportedPlatforms } from '../../config/platforms';
import { PlatformBar } from './PlatformBar';

describe('PlatformBar feed channels', () => {
  let root: Root | undefined;

  afterEach(async () => {
    if (root) await act(async () => root?.unmount());
    root = undefined;
    vi.unstubAllGlobals();
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

    const activePlatformLink = container.querySelector<HTMLAnchorElement>(
      'a[aria-current="page"]',
    );
    const activeChannelLabel = activePlatformLink?.querySelector<HTMLElement>(
      '[data-onefeed-channel-label="true"]',
    );
    expect(activeChannelLabel?.textContent).toBe('推荐');
    expect(activeChannelLabel?.className).toContain('text-[8px]');

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

  it('opens a capability-driven search field and delegates the query', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const scrollElement = document.createElement('div');
    const onSearch = vi.fn(() => true);
    root = createRoot(container);

    await act(async () => root?.render(
      <PlatformBar
        activePlatformId="zhihu"
        channels={[]}
        surface="feed"
        scrollElement={scrollElement}
        colorScheme="light"
        themeReady
        onColorSchemeChange={vi.fn()}
        initialSearchQuery=""
        onSearch={onSearch}
      />,
    ));

    const trigger = container.querySelector<HTMLButtonElement>(
      'button[aria-label="检索知乎内容"]',
    );
    expect(trigger).not.toBeNull();
    await act(async () => trigger?.click());

    const input = container.querySelector<HTMLInputElement>('#onefeed-site-search');
    expect(input).not.toBeNull();
    await act(async () => {
      const valueSetter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value',
      )?.set;
      valueSetter?.call(input, '人工智能');
      input?.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await act(async () => {
      input?.closest('form')?.dispatchEvent(new Event('submit', {
        bubbles: true,
        cancelable: true,
      }));
    });

    expect(onSearch).toHaveBeenCalledWith('人工智能');
  });

  it('shows the current original-site query when rendering search results', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => root?.render(
      <PlatformBar
        activePlatformId="zhihu"
        channels={[]}
        surface="feed"
        scrollElement={document.createElement('div')}
        colorScheme="light"
        themeReady
        onColorSchemeChange={vi.fn()}
        initialSearchQuery="阅读体验"
        onSearch={vi.fn(() => true)}
      />,
    ));

    expect(container.querySelector<HTMLInputElement>('#onefeed-site-search')?.value)
      .toBe('阅读体验');
    expect(container.querySelector('button[aria-label="关闭检索"]')).not.toBeNull();
  });

  it('renders only the configured platforms in their chosen order', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    const platforms = getSupportedPlatforms();
    const zhihu = platforms.find((platform) => platform.id === 'zhihu')!;
    const twitter = platforms.find((platform) => platform.id === 'twitter')!;

    await act(async () => root?.render(
      <PlatformBar
        activePlatformId="zhihu"
        channels={[]}
        platforms={[zhihu, twitter]}
        surface="feed"
        scrollElement={document.createElement('div')}
        colorScheme="light"
        themeReady
        onColorSchemeChange={vi.fn()}
      />,
    ));

    const desktopLinks = Array.from(container.querySelectorAll('header > div nav a'));
    expect(desktopLinks.map((link) => link.textContent)).toEqual(['知乎', 'X']);
    expect(container.textContent).not.toContain('小红书');
  });

  it('requests the full settings page from the header utility button', async () => {
    const sendMessage = vi.fn(() => Promise.resolve());
    vi.stubGlobal('chrome', { runtime: { sendMessage } });
    const container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => root?.render(
      <PlatformBar
        activePlatformId="zhihu"
        channels={[]}
        surface="feed"
        scrollElement={document.createElement('div')}
        colorScheme="light"
        themeReady
        onColorSchemeChange={vi.fn()}
      />,
    ));

    const settings = container.querySelector<HTMLButtonElement>(
      '[aria-label="打开 OneFeed 设置"]',
    );
    await act(async () => settings?.click());

    expect(sendMessage).toHaveBeenCalledWith({ type: 'onefeed:open-options' });
  });
});
