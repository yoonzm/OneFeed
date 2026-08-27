import { i18n } from '#i18n';

export { i18n };

const browserLocale = typeof chrome !== 'undefined' && chrome.i18n?.getUILanguage
  ? chrome.i18n.getUILanguage().replace('_', '-')
  : 'en';

/** 使用扩展界面语言格式化 OneFeed 自己生成的日期和数字。 */
export const uiLocale = browserLocale || 'en';

export function formatNumber(value: number): string {
  return new Intl.NumberFormat(uiLocale).format(value);
}

export function formatDateTime(value: string | number): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat(uiLocale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatShortDateTime(value: string | number): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat(uiLocale, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function localizeDocument(title: string, description: string): void {
  document.documentElement.lang = uiLocale;
  document.title = title;
  const meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
  if (meta) meta.content = description;
}
