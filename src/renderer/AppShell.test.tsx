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
    expect(markup).toContain('background-clip:text');
    expect(markup).toContain('aria-label="切换平台"');
    expect(markup).toContain('aria-label="切换到深色主题"');
    expect(markup).toContain('href="https://github.com/yoonzm/OneFeed"');
    expect(markup).toContain('href="https://www.zhihu.com/"');
    expect(markup).toContain('href="https://x.com/home"');
    expect(markup).toContain('aria-current="page"');
    expect(markup.indexOf('href="https://x.com/home"')).toBeLessThan(
      markup.indexOf('href="https://www.v2ex.com/"'),
    );
    expect(markup).not.toContain('aria-label="X，敬请期待"');
    expect(markup.indexOf('微博')).toBeLessThan(markup.indexOf('小红书'));
    expect(markup.indexOf('小红书')).toBeLessThan(markup.indexOf('Hacker News'));
    expect(markup.indexOf('Hacker News')).toBeLessThan(markup.indexOf('Reddit'));
    expect(markup).toContain('href="https://weibo.com/"');
    expect(markup).toContain('href="https://www.xiaohongshu.com/"');
    expect(markup).toContain('href="https://www.reddit.com/"');
    expect(markup).not.toContain('aria-label="Reddit，敬请期待"');
    expect(markup).not.toContain('哔哩哔哩');
    expect(markup).not.toContain('YouTube');
    expect(markup).not.toContain('敬请期待');
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

  it('renders only the loading icon while organizing a detail', () => {
    const markup = renderToStaticMarkup(
      <DetailApp
        activePlatformId="zhihu"
        surface="article"
        scrollElement={document.createElement('div')}
        onAction={vi.fn(() => false)}
      />,
    );

    expect(markup).toContain('scan-mark');
    expect(markup).not.toContain('正在整理详情');
    expect(markup).not.toContain('正文出现后');
    expect(markup).not.toContain('已读完本文');
  });

  it('places the current site channel control beside the active platform name', () => {
    const markup = renderToStaticMarkup(
      <FeedApp
        activePlatformId="zhihu"
        channels={[
          { id: 'recommend', label: '推荐', active: true },
          { id: 'hot', label: '热榜', active: false },
        ]}
        scrollElement={document.createElement('div')}
        onAction={vi.fn(() => false)}
        onFeedChannelSelect={vi.fn(() => true)}
        onLoadMore={vi.fn(async () => ({ kind: 'exhausted' as const }))}
      />,
    );

    expect(markup).toContain('切换知乎频道，当前推荐');
    expect(markup).toContain('data-onefeed-channel-label="true"');
    expect(markup).toContain('text-[8px]');
    expect(markup).not.toContain('href="https://www.zhihu.com/hot"');
  });
});
