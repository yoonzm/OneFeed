import { useEffect, useRef, useState, type MouseEvent } from 'react';
import {
  getPlannedPlatforms,
  getPlatformById,
  getSupportedPlatforms,
  type PlatformDefinition,
} from '../../config/platforms';
import type { ColorScheme } from '../../theme/useColorScheme';
import { GitHubLink } from './GitHubLink';
import { ThemeSwitch } from './ThemeSwitch';

type ReaderSurface = 'feed' | 'article' | 'thread';

const desktopItemClass = 'relative inline-flex min-h-11 items-center justify-center whitespace-nowrap border-0 bg-transparent px-[9px] text-[11px] leading-tight no-underline focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-onefeed-focus';
const mobileItemClass = 'flex min-h-12 w-full items-center justify-between border-0 border-b border-onefeed-line bg-transparent px-0 text-[13px] no-underline last:border-b-0 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-onefeed-focus';

interface PlatformBarProps {
  activePlatformId: string;
  surface: ReaderSurface;
  scrollElement: HTMLElement;
  colorScheme: ColorScheme;
  themeReady: boolean;
  onColorSchemeChange: (colorScheme: ColorScheme) => void;
}

export function PlatformBar({
  activePlatformId,
  surface,
  scrollElement,
  colorScheme,
  themeReady,
  onColorSchemeChange,
}: PlatformBarProps) {
  const supportedPlatforms = getSupportedPlatforms();
  const plannedPlatforms = getPlannedPlatforms();
  const activePlatform = getPlatformById(activePlatformId);
  const [menuOpen, setMenuOpen] = useState(false);
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

  const renderSupportedLinks = (mobile = false) => supportedPlatforms.map((platform) => {
    const active = platform.id === activePlatformId;
    return (
      <a
        key={platform.id}
        className={`${mobile ? mobileItemClass : desktopItemClass} ${
          active
            ? mobile
              ? 'font-onefeed-emphasis text-onefeed-blue'
              : "font-onefeed-emphasis text-onefeed-blue after:absolute after:right-2 after:bottom-[-1px] after:left-2 after:h-0.5 after:bg-onefeed-blue after:content-['']"
            : 'text-onefeed-muted hover:text-onefeed-blue'
        }`}
        href={platform.homeUrl}
        aria-current={active ? 'page' : undefined}
        onClick={(event) => handleSupportedClick(event, platform)}
      >
        {platform.name}
      </a>
    );
  });

  const renderPlannedItems = (mobile = false) => plannedPlatforms.map((platform) => (
    <span
      key={platform.id}
      className={mobile
        ? `${mobileItemClass} cursor-help text-onefeed-subtle`
        : `${desktopItemClass} cursor-help text-onefeed-faint`}
      title="敬请期待"
      aria-label={`${platform.name}，敬请期待`}
    >
      {platform.name}
    </span>
  ));

  return (
    <header className="sticky top-0 z-20 border-b border-onefeed-line bg-onefeed-paper/95 backdrop-blur-md">
      <div className="mx-auto flex h-[52px] w-full max-w-[1040px] items-stretch gap-7 px-12 max-[720px]:h-14 max-[720px]:justify-between max-[720px]:px-4">
        <a
          className="inline-flex shrink-0 items-center font-onefeed-brand text-sm font-onefeed-emphasis tracking-[.03em] text-onefeed-ink no-underline focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-onefeed-focus"
          href={activePlatform?.homeUrl || '#'}
        >
          OneFeed
        </a>

        <nav className="flex min-w-0 items-stretch gap-1 max-[720px]:hidden" aria-label="切换平台">
          {renderSupportedLinks()}
          <span className="mx-1.5 my-auto h-[18px] w-px bg-onefeed-line" aria-hidden="true" />
          {renderPlannedItems()}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <GitHubLink />
          <span className="h-4 w-px shrink-0 bg-onefeed-line" aria-hidden="true" />
          <ThemeSwitch
            colorScheme={colorScheme}
            disabled={!themeReady}
            onChange={onColorSchemeChange}
          />
          <button
            ref={menuButtonRef}
            className="ml-2 hidden cursor-pointer items-center gap-3 border-0 bg-transparent p-0 text-[11px] focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-onefeed-focus max-[720px]:inline-flex max-[420px]:ml-1 max-[420px]:gap-1.5"
            type="button"
            aria-expanded={menuOpen}
            aria-controls="onefeed-platform-menu"
            onClick={() => setMenuOpen(true)}
          >
            <span className="text-onefeed-muted max-[420px]:hidden">
              当前：{activePlatform?.name || '未识别'}
            </span>
            <strong className="text-[11px] font-onefeed-emphasis text-onefeed-blue">
              切换平台
            </strong>
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="fixed inset-0 z-30 hidden max-[720px]:block">
          <button
            className="absolute inset-0 h-full w-full border-0 bg-onefeed-overlay/48 p-0"
            type="button"
            aria-label="关闭平台菜单"
            onClick={closeMenu}
          />
          <section
            id="onefeed-platform-menu"
            className="absolute right-0 bottom-0 left-0 max-h-[78vh] overflow-y-auto rounded-t-onefeed-sheet bg-onefeed-surface px-5 pt-[18px] pb-[calc(24px+env(safe-area-inset-bottom))] shadow-onefeed-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="platform-menu-title"
          >
            <div className="flex min-h-[38px] items-center justify-between">
              <strong
                id="platform-menu-title"
                className="font-onefeed-reading text-lg leading-snug font-onefeed-emphasis"
              >
                切换平台
              </strong>
              <button
                ref={closeButtonRef}
                className="min-h-9 cursor-pointer border-0 bg-transparent px-1 text-xs text-onefeed-blue focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-onefeed-focus"
                type="button"
                onClick={closeMenu}
              >
                关闭
              </button>
            </div>
            <p className="mt-[18px] mb-[5px] text-[10px] tracking-[.08em] text-onefeed-muted">
              已支持
            </p>
            <nav className="grid" aria-label="已支持平台">
              {renderSupportedLinks(true)}
            </nav>
            <p className="mt-[18px] mb-[5px] text-[10px] tracking-[.08em] text-onefeed-muted">
              待支持
            </p>
            <div className="grid">
              {renderPlannedItems(true)}
            </div>
          </section>
        </div>
      )}
    </header>
  );
}
