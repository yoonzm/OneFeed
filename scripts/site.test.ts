import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const landingPages = [
  {
    file: 'index.html',
    canonical: 'https://onefeed.fyi/',
    language: 'zh-CN',
  },
  {
    file: 'en/index.html',
    canonical: 'https://onefeed.fyi/en/',
    language: 'en',
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
  const [chinesePrivacy, englishPrivacy, robots, sitemap] = await Promise.all([
    loadDocument('privacy/index.html'),
    loadDocument('en/privacy/index.html'),
    loadText('robots.txt'),
    loadText('sitemap.xml'),
  ]);

  expect(chinesePrivacy.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe('https://onefeed.fyi/privacy/');
  expect(englishPrivacy.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe('https://onefeed.fyi/en/privacy/');
  expect(robots).toContain('https://onefeed.fyi/sitemap.xml');
  expect(sitemap).toContain('<loc>https://onefeed.fyi/en/</loc>');
});
