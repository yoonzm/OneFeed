import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'wxt';

const extensionVersion = process.env.EXTENSION_VERSION?.trim();

export default defineConfig({
  srcDir: 'src',
  manifestVersion: 3,
  modules: ['@wxt-dev/module-react', '@wxt-dev/i18n/module'],
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    ...(extensionVersion ? { version: extensionVersion } : {}),
    default_locale: 'en',
    name: '__MSG_manifest_name__',
    description: '__MSG_manifest_description__',
    permissions: ['storage'],
    icons: {
      16: 'icons/icon-16.png',
      32: 'icons/icon-32.png',
      48: 'icons/icon-48.png',
      128: 'icons/icon-128.png',
    },
    action: {
      default_icon: {
        16: 'icons/icon-16.png',
        32: 'icons/icon-32.png',
      },
      default_title: '__MSG_manifest_actionEnabled__',
    },
    web_accessible_resources: [{
      resources: ['icons/icon-32.png'],
      matches: [
        'https://www.zhihu.com/*',
        'https://zhihu.com/*',
        'https://zhuanlan.zhihu.com/*',
        'https://x.com/*',
        'https://www.x.com/*',
        'https://twitter.com/*',
        'https://*.twitter.com/*',
        'https://v2ex.com/*',
        'https://*.v2ex.com/*',
        'https://linux.do/*',
        'https://*.linux.do/*',
        'https://weibo.com/*',
        'https://www.weibo.com/*',
        'https://s.weibo.com/*',
        'https://xiaohongshu.com/*',
        'https://www.xiaohongshu.com/*',
        'https://news.ycombinator.com/*',
        'https://36kr.com/*',
        'https://*.36kr.com/*',
        'https://reddit.com/*',
        'https://www.reddit.com/*',
      ],
    }],
  },
});
