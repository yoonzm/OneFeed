import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourceDirectory = resolve(repositoryRoot, 'website');
const outputDirectory = resolve(repositoryRoot, 'dist-site');
const assetDirectory = resolve(outputDirectory, 'assets');

const assets = [
  ['public/icons/icon-128.png', 'assets/icon-128.png'],
  ['store_assets/promo.png', 'assets/onefeed-social-preview.png'],
  ['node_modules/@fontsource-variable/geist/files/geist-latin-wght-normal.woff2', 'assets/fonts/geist-latin-wght-normal.woff2'],
];

await rm(outputDirectory, { recursive: true, force: true });
await cp(sourceDirectory, outputDirectory, { recursive: true });
await mkdir(resolve(assetDirectory, 'platform-icons'), { recursive: true });

for (const [source, destination] of assets) {
  await mkdir(dirname(resolve(outputDirectory, destination)), { recursive: true });
  await cp(resolve(repositoryRoot, source), resolve(outputDirectory, destination));
}

await cp(
  resolve(repositoryRoot, 'public/platform-icons'),
  resolve(assetDirectory, 'platform-icons'),
  { recursive: true },
);

const packageJson = JSON.parse(await readFile(resolve(repositoryRoot, 'package.json'), 'utf8'));
const htmlFiles = ['index.html', 'privacy/index.html', 'zh-cn/index.html', 'zh-cn/privacy/index.html'];

for (const relativePath of htmlFiles) {
  const filePath = resolve(outputDirectory, relativePath);
  const html = await readFile(filePath, 'utf8');
  await writeFile(filePath, html.replaceAll('{{VERSION}}', packageJson.version));
}

console.log(`OneFeed website ${packageJson.version} built at ${outputDirectory}`);
