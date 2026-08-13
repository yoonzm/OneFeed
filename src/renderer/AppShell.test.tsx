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

  it.each(['feed', 'detail'] as const)('renders platform navigation on the %s surface', (surface) => {
    const commonProps = {
      activePlatformId: 'zhihu',
      scrollElement: document.createElement('div'),
      onAction: vi.fn(() => false),
      onLoadMore: vi.fn(async () => ({ kind: 'exhausted' as const })),
    };
    const markup = renderToStaticMarkup(
      surface === 'feed'
        ? <FeedApp {...commonProps} />
        : <DetailApp {...commonProps} surface="article" />,
    );

    expect(markup).toContain('OneFeed');
    expect(markup).toContain('aria-label="切换平台"');
    expect(markup).toContain('aria-label="切换到深色主题"');
    expect(markup).toContain('href="https://github.com/yoonzm/OneFeed"');
    expect(markup).toContain('href="https://www.zhihu.com/"');
    expect(markup).toContain('aria-current="page"');
    expect(markup.indexOf('微博')).toBeLessThan(markup.indexOf('小红书'));
    expect(markup.indexOf('小红书')).toBeLessThan(markup.indexOf('Reddit'));
    expect(markup.indexOf('Reddit')).toBeLessThan(markup.indexOf('哔哩哔哩'));
    expect(markup.indexOf('哔哩哔哩')).toBeLessThan(markup.indexOf('YouTube'));
    expect(markup).toContain('href="https://www.reddit.com/"');
    expect(markup).not.toContain('aria-label="Reddit，敬请期待"');
    expect(markup).toContain('title="敬请期待"');
    expect(markup).not.toContain('待支持 · 第');
  });

  it('renders only the loading icon while organizing the feed', () => {
    const markup = renderToStaticMarkup(
      <FeedApp
        activePlatformId="zhihu"
        scrollElement={document.createElement('div')}
        onAction={vi.fn(() => false)}
        onLoadMore={vi.fn(async () => ({ kind: 'exhausted' as const }))}
      />,
    );

    expect(markup).toContain('scan-mark');
    expect(markup).not.toContain('正在整理信息流');
    expect(markup).not.toContain('页面内容出现后');
    expect(markup).not.toContain('已读到这里');
  });
});
