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
    <main className="popup">
      <header className="popup-header">
        <span className="mark">O</span>
        <div><strong>OneFeed</strong><small>统一信息流</small></div>
      </header>
      <section className="toggle-section">
        <div>
          <strong>统一信息流</strong>
          <p>{enabled ? '已启用统一阅读界面' : '显示网站原始页面'}</p>
        </div>
        <button
          className={`switch ${enabled ? 'switch-on' : ''}`}
          type="button"
          onClick={toggle}
          disabled={!ready}
          role="switch"
          aria-checked={enabled}
          aria-label="启用统一信息流"
        ><span /></button>
      </section>

      <section className="platform-section" aria-labelledby="supported-platforms-title">
        <div className="section-heading">
          <strong id="supported-platforms-title">切换平台</strong>
          <small>{activePlatform
            ? `当前：${activePlatform.name}${activePlatform.status === 'supported' ? '' : ' · 待支持'}`
            : '当前页面未适配'}</small>
        </div>
        <div className="popup-platform-list">
          {supportedPlatforms.map((platform) => {
            const active = platform.id === activePlatformId;
            return (
              <button
                key={platform.id}
                className={`popup-platform-item${active ? ' popup-platform-active' : ''}`}
                type="button"
                aria-current={active ? 'page' : undefined}
                onClick={() => navigateToPlatform(platform)}
              >
                <span>{platform.name}</span>
                <small>{active ? '当前' : '打开'}</small>
              </button>
            );
          })}
        </div>
      </section>

      <section className="platform-section planned-section" aria-labelledby="planned-platforms-title">
        <div className="section-heading">
          <strong id="planned-platforms-title">待支持</strong>
          <small>按计划顺序</small>
        </div>
        <div className="popup-platform-list">
          {plannedPlatforms.map((platform) => (
            <button
              key={platform.id}
              className="popup-platform-item popup-platform-planned"
              type="button"
              onClick={() => setNotice(
                `${platform.name}尚未适配，当前计划第 ${platform.plannedOrder} 位。`,
              )}
            >
              <span>{platform.name}</span>
              <small>第 {platform.plannedOrder} 位</small>
            </button>
          ))}
        </div>
      </section>

      {notice && <p className="popup-notice" role="status">{notice}</p>}
      <footer className="popup-footer">0.1 · Focus Paper</footer>
    </main>
  );
}
