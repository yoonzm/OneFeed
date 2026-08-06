import { startContentScript } from '../content';

export default defineContentScript({
  matches: [
    'https://www.zhihu.com/*',
    'https://zhihu.com/*',
    'https://x.com/*',
    'https://*.x.com/*',
    'https://twitter.com/*',
    'https://*.twitter.com/*',
  ],
  runAt: 'document_idle',
  main(ctx) {
    const cleanup = startContentScript();
    ctx.onInvalidated(cleanup);
  },
});
