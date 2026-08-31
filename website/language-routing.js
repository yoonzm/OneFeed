export const languagePreferenceKey = 'onefeed-language';

const supportedLanguages = new Set(['en', 'zh-CN']);
const chineseRouteByEnglishRoute = new Map([
  ['/', '/zh-cn/'],
  ['/index.html', '/zh-cn/'],
  ['/privacy', '/zh-cn/privacy/'],
  ['/privacy/', '/zh-cn/privacy/'],
  ['/privacy/index.html', '/zh-cn/privacy/'],
]);

export function resolvePreferredLanguage(browserLanguages, storedLanguage) {
  if (supportedLanguages.has(storedLanguage)) return storedLanguage;

  const primaryLanguage = browserLanguages.find(Boolean) ?? '';
  return primaryLanguage.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en';
}

export function getLanguageRedirect(pathname, preferredLanguage) {
  if (preferredLanguage !== 'zh-CN') return null;
  return chineseRouteByEnglishRoute.get(pathname) ?? null;
}
