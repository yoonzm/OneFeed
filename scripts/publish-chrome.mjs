import { appendFile, readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const chromeWebStoreScope = 'https://www.googleapis.com/auth/chromewebstore';
const apiOrigin = 'https://chromewebstore.googleapis.com';

export function parseChromeVersion(version) {
  if (typeof version !== 'string' || !/^(0|[1-9]\d*)(\.(0|[1-9]\d*)){0,3}$/.test(version)) {
    throw new Error(`Invalid Chrome extension version: ${version}`);
  }

  const parts = version.split('.').map(Number);
  if (parts.some((part) => part > 65535)) {
    throw new Error(`Chrome extension version component exceeds 65535: ${version}`);
  }

  return [...parts, ...Array(4 - parts.length).fill(0)];
}

export function compareChromeVersions(left, right) {
  const leftParts = parseChromeVersion(left);
  const rightParts = parseChromeVersion(right);

  for (let index = 0; index < leftParts.length; index += 1) {
    if (leftParts[index] !== rightParts[index]) {
      return leftParts[index] > rightParts[index] ? 1 : -1;
    }
  }

  return 0;
}

function getRevisionVersions(revisionStatus) {
  return revisionStatus?.distributionChannels
    ?.map((channel) => channel.crxVersion)
    .filter(Boolean) ?? [];
}

export function getHighestStoreVersion(status) {
  const versions = [
    ...getRevisionVersions(status.publishedItemRevisionStatus),
    ...getRevisionVersions(status.submittedItemRevisionStatus),
  ];

  return versions.reduce(
    (highest, version) => !highest || compareChromeVersions(version, highest) > 0 ? version : highest,
    null,
  );
}

export function getPublicationDecision(status, localVersion) {
  parseChromeVersion(localVersion);
  const submittedState = status.submittedItemRevisionStatus?.state;
  const storeVersion = getHighestStoreVersion(status);

  if (submittedState === 'PENDING_REVIEW' || submittedState === 'STAGED') {
    return { kind: 'deferred', submittedState, storeVersion };
  }

  if (storeVersion) {
    const comparison = compareChromeVersions(localVersion, storeVersion);
    if (comparison === 0 && submittedState !== 'REJECTED' && submittedState !== 'CANCELLED') {
      return { kind: 'skipped', storeVersion };
    }
    if (comparison <= 0) {
      throw new Error(
        `Local version ${localVersion} must be greater than Chrome Web Store version ${storeVersion}`,
      );
    }
  }

  return { kind: 'publish', storeVersion };
}

function requireEnvironment(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

async function requestJson(url, accessToken, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...options.headers,
    },
    signal: AbortSignal.timeout(30_000),
  });
  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(`${options.method ?? 'GET'} ${url} failed (${response.status}): ${responseText}`);
  }

  return responseText ? JSON.parse(responseText) : {};
}

async function findZipPath() {
  if (process.env.CWS_ZIP_PATH) {
    return resolve(process.env.CWS_ZIP_PATH);
  }

  const outputDirectory = resolve('.output');
  const zipFiles = (await readdir(outputDirectory))
    .filter((fileName) => fileName.endsWith('-chrome.zip'));

  if (zipFiles.length !== 1) {
    throw new Error(`Expected exactly one Chrome ZIP in .output, found ${zipFiles.length}`);
  }

  return resolve(outputDirectory, zipFiles[0]);
}

async function report(title, details) {
  const lines = [`## ${title}`, '', ...details, ''];
  console.log(`${title}: ${details.join(' ')}`);

  if (process.env.GITHUB_STEP_SUMMARY) {
    await appendFile(process.env.GITHUB_STEP_SUMMARY, `${lines.join('\n')}\n`, 'utf8');
  }
}

async function setWorkflowOutput(name, value) {
  if (process.env.GITHUB_OUTPUT) {
    await appendFile(process.env.GITHUB_OUTPUT, `${name}=${value}\n`, 'utf8');
  }
}

async function reportDecision(decision, localVersion) {
  if (decision.kind === 'deferred') {
    await report('Chrome Web Store publication deferred', [
      `Current submission state: \`${decision.submittedState}\`.`,
      `Local version \`${localVersion}\` will be retried by the scheduled workflow.`,
    ]);
    return;
  }

  if (decision.kind === 'skipped') {
    await report('Chrome Web Store publication skipped', [
      `Version \`${localVersion}\` is already uploaded or published.`,
    ]);
  }
}

function normalizeUploadState(state) {
  return state?.replace(/^UPLOAD_/, '');
}

async function waitForUpload(accessToken, itemUrl) {
  for (let attempt = 1; attempt <= 24; attempt += 1) {
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 5_000));
    const status = await requestJson(`${itemUrl}:fetchStatus`, accessToken);
    const uploadState = normalizeUploadState(status.lastAsyncUploadState);

    if (uploadState === 'SUCCEEDED') {
      return;
    }
    if (uploadState === 'FAILED' || uploadState === 'NOT_FOUND') {
      throw new Error(`Chrome Web Store upload ended with state: ${uploadState}`);
    }
  }

  throw new Error('Chrome Web Store upload did not finish within two minutes');
}

async function preflightChromeExtension() {
  const accessToken = requireEnvironment('CWS_ACCESS_TOKEN');
  const publisherId = requireEnvironment('CWS_PUBLISHER_ID');
  const extensionId = requireEnvironment('CWS_EXTENSION_ID');
  const itemName = `publishers/${encodeURIComponent(publisherId)}/items/${encodeURIComponent(extensionId)}`;
  const itemUrl = `${apiOrigin}/v2/${itemName}`;
  const packageJson = JSON.parse(await readFile(resolve('package.json'), 'utf8'));
  const localVersion = packageJson.version;
  const currentStatus = await requestJson(`${itemUrl}:fetchStatus`, accessToken);
  const decision = getPublicationDecision(currentStatus, localVersion);

  await setWorkflowOutput('should_publish', decision.kind === 'publish');
  if (decision.kind === 'publish') {
    await report('Chrome Web Store publication ready', [
      `Version \`${localVersion}\` is newer than the current store version.`,
    ]);
    return;
  }
  await reportDecision(decision, localVersion);
}

async function publishChromeExtension() {
  const accessToken = requireEnvironment('CWS_ACCESS_TOKEN');
  const publisherId = requireEnvironment('CWS_PUBLISHER_ID');
  const extensionId = requireEnvironment('CWS_EXTENSION_ID');
  const itemName = `publishers/${encodeURIComponent(publisherId)}/items/${encodeURIComponent(extensionId)}`;
  const itemUrl = `${apiOrigin}/v2/${itemName}`;

  const manifest = JSON.parse(await readFile(resolve('.output/chrome-mv3/manifest.json'), 'utf8'));
  const localVersion = manifest.version;
  parseChromeVersion(localVersion);

  const currentStatus = await requestJson(`${itemUrl}:fetchStatus`, accessToken);
  const decision = getPublicationDecision(currentStatus, localVersion);
  if (decision.kind !== 'publish') {
    await reportDecision(decision, localVersion);
    return;
  }

  const zipPath = await findZipPath();
  const zipContents = await readFile(zipPath);
  const uploadResponse = await requestJson(
    `${apiOrigin}/upload/v2/${itemName}:upload`,
    accessToken,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/zip' },
      body: zipContents,
    },
  );
  const uploadState = normalizeUploadState(uploadResponse.uploadState);

  if (uploadState === 'IN_PROGRESS') {
    await waitForUpload(accessToken, itemUrl);
  } else if (uploadState !== 'SUCCEEDED') {
    throw new Error(`Chrome Web Store upload ended with state: ${uploadState ?? 'UNKNOWN'}`);
  }

  const publishResponse = await requestJson(`${itemUrl}:publish`, accessToken, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      publishType: 'DEFAULT_PUBLISH',
      skipReview: false,
      blockOnWarnings: true,
    }),
  });

  await report('Chrome Web Store submission created', [
    `Version: \`${localVersion}\`.`,
    `State: \`${publishResponse.state ?? 'UNKNOWN'}\`.`,
    'The extension will be published automatically after Google approves the submission.',
  ]);
}

const isDirectExecution = process.argv[1]
  && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;

if (isDirectExecution) {
  const command = process.argv.includes('--check-only')
    ? preflightChromeExtension
    : publishChromeExtension;
  command().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    console.error(`Required OAuth scope: ${chromeWebStoreScope}`);
    process.exitCode = 1;
  });
}
