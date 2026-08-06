import { useEffect, useState } from 'react';

export function Popup() {
  const [enabled, setEnabled] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    chrome.storage.local.get({ enabled: true }, (stored) => {
      setEnabled(stored.enabled !== false);
      setReady(true);
    });
  }, []);

  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    chrome.storage.local.set({ enabled: next });
  };

  return (
    <main className="popup">
      <header>
        <span className="mark">O</span>
        <div><strong>OneFeed</strong><small>统一信息流</small></div>
      </header>
      <section>
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
      <footer>0.1 · Focus Paper</footer>
    </main>
  );
}
