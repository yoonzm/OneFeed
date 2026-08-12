import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ZHIHU_PLATFORM } from '../../config/platforms';
import { navigateToPlatform, Popup } from './Popup';

describe('Popup platform navigation', () => {
  beforeEach(() => {
    vi.stubGlobal('chrome', {
      tabs: {
        update: vi.fn((_properties, callback) => callback?.()),
      },
    });
    vi.spyOn(window, 'close').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('shows supported and planned platforms in product order', () => {
    const markup = renderToStaticMarkup(<Popup />);

    expect(markup).toContain('切换平台');
    expect(markup).toContain('知乎');
    expect(markup).toContain('Linux DO');
    expect(markup.indexOf('微博')).toBeLessThan(markup.indexOf('小红书'));
    expect(markup.indexOf('小红书')).toBeLessThan(markup.indexOf('哔哩哔哩'));
  });

  it('navigates the active tab to a supported platform and closes the popup', () => {
    navigateToPlatform(ZHIHU_PLATFORM);

    expect(chrome.tabs.update).toHaveBeenCalledWith(
      { url: 'https://www.zhihu.com/' },
      expect.any(Function),
    );
    expect(window.close).toHaveBeenCalledOnce();
  });
});
