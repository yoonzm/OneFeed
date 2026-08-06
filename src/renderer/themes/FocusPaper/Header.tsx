import type { FeedSource } from '../../../types/feed';

interface HeaderProps {
  count: number;
  source: FeedSource;
  onDisable: () => void;
}

export function Header({ count, source, onDisable }: HeaderProps) {
  return (
    <header className="reader-header">
      <a className="brand" href={source.homeUrl} target="_self">
        <span className="brand-mark" aria-hidden="true">O</span>
        <span>
          <strong>OneFeed</strong>
          <small>统一信息流 · 专注阅读</small>
        </span>
      </a>
      <div className="header-actions">
        <div className="header-status" aria-live="polite">
          <span className="status-dot" aria-hidden="true" />
          已整理 {count} 条内容
        </div>
        <button className="disable-reader" type="button" onClick={onDisable}>
          查看原页面
        </button>
      </div>
    </header>
  );
}
