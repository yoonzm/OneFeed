import { startContentScript } from '../content';

export default defineContentScript({
  matches: [
    'https://www.zhihu.com/*',
    'https://zhihu.com/*',
    'https://zhuanlan.zhihu.com/*',
    'https://x.com/*',
    'https://*.x.com/*',
    'https://twitter.com/*',
    'https://*.twitter.com/*',
    'https://v2ex.com/*',
    'https://*.v2ex.com/*',
    'https://linux.do/*',
    'https://*.linux.do/*',
    'https://weibo.com/*',
    'https://*.weibo.com/*',
    'https://xiaohongshu.com/*',
    'https://*.xiaohongshu.com/*',
    'https://news.ycombinator.com/*',
    'https://reddit.com/*',
    'https://*.reddit.com/*',
  ],
  runAt: 'document_start',
  main(ctx) {
    const controller = startContentScript();
    ctx.addEventListener(window, 'wxt:locationchange', () => {
      ctx.requestAnimationFrame(() => {
        ctx.requestAnimationFrame(controller.refresh);
      });
    });
    ctx.onInvalidated(controller.cleanup);
  },
});
