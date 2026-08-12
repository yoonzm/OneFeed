import { useEffect, useRef, useState, type MouseEvent } from 'react';
import {
  getPlannedPlatforms,
  getPlatformById,
  getSupportedPlatforms,
  type PlatformDefinition,
} from '../../config/platforms';

type ReaderSurface = 'feed' | 'article' | 'thread';

interface PlatformBarProps {
  activePlatformId: string;
  surface: ReaderSurface;
  scrollElement: HTMLElement;
}

function plannedStatus(platform: PlatformDefinition): string {
  if (platform.status === 'adapting') return '适配中';
  if (platform.status === 'testing') return '测试中';
  return platform.plannedOrder ? `待支持 · 第 ${platform.plannedOrder} 位` : '待支持';
}

export function PlatformBar({
  activePlatformId,
  surface,
  scrollElement,
}: PlatformBarProps) {
  const supportedPlatforms = getSupportedPlatforms();
  const plannedPlatforms = getPlannedPlatforms();
  const activePlatform = getPlatformById(activePlatformId);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!menuOpen) return undefined;
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setMenuOpen(false);
      menuButtonRef.current?.focus();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [menuOpen]);

  const closeMenu = () => {
    setMenuOpen(false);
    menuButtonRef.current?.focus();
  };

  const handleSupportedClick = (
    event: MouseEvent<HTMLAnchorElement>,
    platform: PlatformDefinition,
  ) => {
    setNotice('');
    if (
      platform.id === activePlatformId &&
      surface === 'feed' &&
      event.button === 0 &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.shiftKey &&
      !event.altKey
    ) {
      event.preventDefault();
      setMenuOpen(false);
      scrollElement.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePlannedClick = (platform: PlatformDefinition) => {
    setNotice(`${platform.name}：${plannedStatus(platform)}`);
  };

  const supportedLinks = supportedPlatforms.map((platform) => {
    const active = platform.id === activePlatformId;
    return (
      <a
        key={platform.id}
        className={`platform-item platform-supported${active ? ' platform-active' : ''}`}
        href={platform.homeUrl}
        aria-current={active ? 'page' : undefined}
        onClick={(event) => handleSupportedClick(event, platform)}
      >
        {platform.name}
      </a>
    );
  });

  const plannedButtons = plannedPlatforms.map((platform) => (
    <button
      key={platform.id}
      className="platform-item platform-planned"
      type="button"
      onClick={() => handlePlannedClick(platform)}
      aria-label={`${platform.name}，${plannedStatus(platform)}`}
    >
      <span>{platform.name}</span>
      <small>{plannedStatus(platform)}</small>
    </button>
  ));

  return (
    <header className="platform-bar">
      <div className="platform-bar-inner">
        <a className="platform-brand" href={activePlatform?.homeUrl || '#'}>
          OneFeed
        </a>

        <nav className="platform-tabs" aria-label="切换平台">
          {supportedLinks}
          <span className="platform-divider" aria-hidden="true" />
          {plannedButtons}
        </nav>

        <button
          ref={menuButtonRef}
          className="platform-menu-trigger"
          type="button"
          aria-expanded={menuOpen}
          aria-controls="onefeed-platform-menu"
          onClick={() => setMenuOpen(true)}
        >
          <span>当前：{activePlatform?.name || '未识别'}</span>
          <strong>切换平台</strong>
        </button>
      </div>

      {notice && <p className="platform-notice" role="status">{notice}</p>}

      {menuOpen && (
        <div className="platform-menu-layer">
          <button
            className="platform-menu-backdrop"
            type="button"
            aria-label="关闭平台菜单"
            onClick={closeMenu}
          />
          <section
            id="onefeed-platform-menu"
            className="platform-menu"
            role="dialog"
            aria-modal="true"
            aria-labelledby="platform-menu-title"
          >
            <div className="platform-menu-heading">
              <strong id="platform-menu-title">切换平台</strong>
              <button ref={closeButtonRef} type="button" onClick={closeMenu}>关闭</button>
            </div>
            <p className="platform-group-label">已支持</p>
            <nav className="platform-menu-options" aria-label="已支持平台">
              {supportedLinks}
            </nav>
            <p className="platform-group-label">待支持</p>
            <div className="platform-menu-options">
              {plannedButtons}
            </div>
          </section>
        </div>
      )}
    </header>
  );
}
