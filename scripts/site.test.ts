import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-expect-error The website serves this dependency-free module directly in the browser.
import { getLanguageRedirect, resolvePreferredLanguage } from '../website/language-routing.js';

const landingPages = [
  {
    file: 'index.html',
    canonical: 'https://onefeed.fyi/',
    language: 'en',
  },
  {
    file: 'zh-cn/index.html',
    canonical: 'https://onefeed.fyi/zh-cn/',
    language: 'zh-CN',
  },
];

const chromeWebStoreUrl = 'https://chromewebstore.google.com/detail/onefeed-%E2%80%94-one-way-to-read/phndibmgpccnhkpmcpijjfbllgadiabd';

function getWebsiteFile(relativePath: string) {
  return resolve(process.cwd(), 'website', relativePath);
}

async function loadDocument(relativePath: string) {
  const html = await readFile(getWebsiteFile(relativePath), 'utf8');
  return new DOMParser().parseFromString(html, 'text/html');
}

async function loadText(relativePath: string) {
  return readFile(getWebsiteFile(relativePath), 'utf8');
}

describe.each(landingPages)('$file SEO structure', ({ file, canonical, language }) => {
  it('has complete localized metadata and structured data', async () => {
    const document = await loadDocument(file);
    const structuredData = [...document.querySelectorAll('script[type="application/ld+json"]')]
      .map((script) => JSON.parse(script.textContent ?? '{}'));

    expect(document.documentElement.lang).toBe(language);
    expect(document.querySelectorAll('h1')).toHaveLength(1);
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')?.length).toBeGreaterThan(80);
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(canonical);
    expect(document.querySelectorAll('link[rel="alternate"][hreflang]')).toHaveLength(3);
    expect(document.querySelector('script[src="/app.js"]')?.getAttribute('type')).toBe('module');
    expect(document.querySelector('[data-language-choice]')).not.toBeNull();
    expect(structuredData.map((entry) => entry['@type'])).toEqual(['SoftwareApplication', 'FAQPage']);
    expect(document.querySelector('.primary-action')?.getAttribute('href')).toBe(chromeWebStoreUrl);
    expect(structuredData[0].installUrl).toBe(chromeWebStoreUrl);
  });

  it('keeps the interactive demo and supported platform list in sync', async () => {
    const document = await loadDocument(file);

    expect(document.querySelectorAll('[data-demo-panel]')).toHaveLength(2);
    expect(document.querySelectorAll('.platform-item')).toHaveLength(9);
    expect(document.querySelectorAll('.faq-list details')).toHaveLength(4);
  });
});

it('publishes localized privacy pages and discovery files', async () => {
  const [englishPrivacy, chinesePrivacy, robots, sitemap, redirects] = await Promise.all([
    loadDocument('privacy/index.html'),
    loadDocument('zh-cn/privacy/index.html'),
    loadText('robots.txt'),
    loadText('sitemap.xml'),
    loadText('_redirects'),
  ]);

  expect(englishPrivacy.documentElement.lang).toBe('en');
  expect(chinesePrivacy.documentElement.lang).toBe('zh-CN');
  expect(englishPrivacy.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe('https://onefeed.fyi/privacy/');
  expect(chinesePrivacy.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe('https://onefeed.fyi/zh-cn/privacy/');
  expect(englishPrivacy.querySelector('script[src="/app.js"]')?.getAttribute('type')).toBe('module');
  expect(chinesePrivacy.querySelector('script[src="/app.js"]')?.getAttribute('type')).toBe('module');
  expect(robots).toContain('https://onefeed.fyi/sitemap.xml');
  expect(sitemap).toContain('<loc>https://onefeed.fyi/zh-cn/</loc>');
  expect(sitemap).not.toContain('onefeed.fyi/en/');
  expect(redirects).not.toContain('/en');
});

describe('language routing', () => {
  it('uses English by default and sends Chinese browsers to localized routes', () => {
    expect(resolvePreferredLanguage(['en-US'], null)).toBe('en');
    expect(resolvePreferredLanguage(['zh-CN', 'en-US'], null)).toBe('zh-CN');
    expect(getLanguageRedirect('/', 'zh-CN')).toBe('/zh-cn/');
    expect(getLanguageRedirect('/privacy/', 'zh-CN')).toBe('/zh-cn/privacy/');
    expect(getLanguageRedirect('/zh-cn/', 'zh-CN')).toBeNull();
  });

  it('lets a stored manual choice override the browser language', () => {
    expect(resolvePreferredLanguage(['zh-CN'], 'en')).toBe('en');
    expect(resolvePreferredLanguage(['en-US'], 'zh-CN')).toBe('zh-CN');
  });
});
