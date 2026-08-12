import { useEffect, useState } from 'react';
import {
  getPlannedPlatforms,
  getPlatformById,
  getPlatformForUrl,
  getSupportedPlatforms,
  type PlatformDefinition,
} from '../../config/platforms';

export function navigateToPlatform(platform: PlatformDefinition): void {
  chrome.tabs.update({ url: platform.homeUrl }, () => window.close());
}

const platformItemClass = 'flex min-h-[38px] cursor-pointer items-center justify-between border-0 border-b border-onefeed-line/70 bg-transparent px-1 text-left text-xs last:border-b-0 hover:bg-onefeed-blue-soft hover:text-onefeed-blue focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-onefeed-focus';

export function Popup() {
  const [enabled, setEnabled] = useState(true);
  const [ready, setReady] = useState(false);
  const [activePlatformId, setActivePlatformId] = useState<string>();
  const [notice, setNotice] = useState('');

  useEffect(() => {
    chrome.storage.local.get({ enabled: true }, (stored) => {
      setEnabled(stored.enabled !== false);
      setReady(true);
    });
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (!tab?.url) return;
      setActivePlatformId(getPlatformForUrl(tab.url)?.id);
    });
  }, []);

  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    chrome.storage.local.set({ enabled: next });
  };

  const supportedPlatforms = getSupportedPlatforms();
  const plannedPlatforms = getPlannedPlatforms();
  const activePlatform = activePlatformId
    ? getPlatformById(activePlatformId)
    : undefined;

  return (
    <main className="box-border px-5 py-[18px] [&_*]:box-border">
      <header className="flex items-center gap-[11px] border-b border-onefeed-line pb-4">
        <span className="grid size-8 place-items-center bg-onefeed-blue font-onefeed-brand text-lg font-bold text-white">
          O
        </span>
        <div>
          <strong className="block font-onefeed-brand text-sm font-onefeed-emphasis tracking-[.03em]">
            OneFeed
          </strong>
          <small className="mt-[3px] block text-[10px] tracking-[.1em] text-onefeed-muted">
            统一信息流
          </small>
        </div>
      </header>
      <section className="flex items-center justify-between py-[18px]">
        <div>
          <strong className="text-[13px]">统一信息流</strong>
          <p className="mt-[3px] mb-0 text-[11px] text-onefeed-muted">
            {enabled ? '已启用统一阅读界面' : '显示网站原始页面'}
          </p>
        </div>
        <button
          className={`relative h-6 w-[42px] shrink-0 cursor-pointer rounded-full border-0 p-0 transition-colors duration-150 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-onefeed-focus disabled:cursor-not-allowed disabled:opacity-60 ${
            enabled ? 'bg-onefeed-blue' : 'bg-onefeed-control'
          }`}
          type="button"
          onClick={toggle}
          disabled={!ready}
          role="switch"
          aria-checked={enabled}
          aria-label="启用统一信息流"
        >
          <span className={`absolute top-[3px] left-[3px] size-[18px] rounded-full bg-white shadow-onefeed-toggle transition-transform duration-150 ${
            enabled ? 'translate-x-[18px]' : 'translate-x-0'
          }`} />
        </button>
      </section>

      <section
        className="border-t border-onefeed-line pt-[15px] pb-[13px]"
        aria-labelledby="supported-platforms-title"
      >
        <div className="mb-[5px] flex items-baseline justify-between">
          <strong id="supported-platforms-title" className="text-xs">切换平台</strong>
          <small className="text-[9px] text-onefeed-subtle">
            {activePlatform
              ? `当前：${activePlatform.name}${activePlatform.status === 'supported' ? '' : ' · 待支持'}`
              : '当前页面未适配'}
          </small>
        </div>
        <div className="grid">
          {supportedPlatforms.map((platform) => {
            const active = platform.id === activePlatformId;
            return (
              <button
                key={platform.id}
                className={`${platformItemClass} ${
                  active ? 'font-onefeed-emphasis text-onefeed-blue' : 'text-onefeed-ink'
                }`}
                type="button"
                aria-current={active ? 'page' : undefined}
                onClick={() => navigateToPlatform(platform)}
              >
                <span>{platform.name}</span>
                <small className={`text-[9px] ${
                  active ? 'text-onefeed-blue' : 'text-onefeed-subtle'
                }`}>{active ? '当前' : '打开'}</small>
              </button>
            );
          })}
        </div>
      </section>

      <section
        className="border-t border-onefeed-line pt-[15px] pb-[9px]"
        aria-labelledby="planned-platforms-title"
      >
        <div className="mb-[5px] flex items-baseline justify-between">
          <strong id="planned-platforms-title" className="text-xs">待支持</strong>
          <small className="text-[9px] text-onefeed-subtle">按计划顺序</small>
        </div>
        <div className="grid">
          {plannedPlatforms.map((platform) => (
            <button
              key={platform.id}
              className={`${platformItemClass} text-onefeed-muted`}
              type="button"
              onClick={() => setNotice(
                `${platform.name}尚未适配，当前计划第 ${platform.plannedOrder} 位。`,
              )}
            >
              <span>{platform.name}</span>
              <small className="text-[9px] text-onefeed-subtle">
                第 {platform.plannedOrder} 位
              </small>
            </button>
          ))}
        </div>
      </section>

      {notice && (
        <p
          className="mt-[3px] mb-3 bg-onefeed-blue-soft px-[10px] py-2 text-[10px] leading-normal text-onefeed-notice"
          role="status"
        >
          {notice}
        </p>
      )}
      <footer className="font-onefeed-mono text-[9px] tracking-[.08em] text-onefeed-faint">
        0.1 · Focus Paper
      </footer>
    </main>
  );
}
