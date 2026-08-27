import { describe, expect, it } from 'vitest';
import enMessages from './locales/en.json';
import zhCnMessages from './locales/zh_CN.json';
import { createTestI18n, flattenMessages } from './test/i18n';

describe('localization resources', () => {
  it('keeps English and Simplified Chinese message keys in sync', () => {
    const englishKeys = Object.keys(flattenMessages(enMessages)).sort();
    const chineseKeys = Object.keys(flattenMessages(zhCnMessages)).sort();

    expect(chineseKeys).toEqual(englishKeys);
  });

  it('supports English substitutions and plural forms', () => {
    const english = createTestI18n(enMessages);

    expect(english.t('board.openPlatform', ['Hacker News'])).toBe('Open Hacker News');
    expect(english.t('comment.replyCount', 1)).toBe('1 reply');
    expect(english.t('comment.replyCount', 2)).toBe('2 replies');
  });
});
