import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'wxt';

const extensionVersion = process.env.EXTENSION_VERSION?.trim();

export default defineConfig({
  srcDir: 'src',
  manifestVersion: 3,
  modules: ['@wxt-dev/module-react'],
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    ...(extensionVersion ? { version: extensionVersion } : {}),
    name: 'OneFeed — One way to read your feeds',
    description: '把不同网站的信息流统一成你喜欢的阅读体验，让你重新掌握信息流的界面、内容密度与阅读方式。',
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
      default_title: '打开 OneFeed 启动中心（已开启）',
    },
  },
});
