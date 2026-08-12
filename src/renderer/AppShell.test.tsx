import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DetailApp from './DetailApp';
import FeedApp from './FeedApp';
import { useDetailStore } from './store/useDetailStore';
import { useFeedStore } from './store/useFeedStore';

describe('reader app shells', () => {
  beforeEach(() => {
    useFeedStore.getState().clear();
    useDetailStore.getState().clear();
  });

  it.each([
    ['feed', FeedApp],
    ['detail', DetailApp],
  ] as const)('renders the %s surface without a product header', (_name, App) => {
    const markup = renderToStaticMarkup(
      <App
        scrollElement={document.createElement('div')}
        onAction={vi.fn(() => false)}
      />,
    );

    expect(markup).not.toContain('reader-header');
    expect(markup).not.toContain('OneFeed');
    expect(markup).not.toContain('查看原页面');
    expect(markup).not.toContain('测试站点');
  });

  it('renders only the loading icon while organizing the feed', () => {
    const markup = renderToStaticMarkup(
      <FeedApp
        scrollElement={document.createElement('div')}
        onAction={vi.fn(() => false)}
      />,
    );

    expect(markup).toContain('scan-mark');
    expect(markup).not.toContain('正在整理信息流');
    expect(markup).not.toContain('页面内容出现后');
    expect(markup).not.toContain('已读到这里');
  });
});
