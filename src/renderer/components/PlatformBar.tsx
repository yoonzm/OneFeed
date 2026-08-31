import {
  CaretDown,
  Check,
  EyeSlash,
  GearSix,
  MagnifyingGlass,
  X,
} from '@phosphor-icons/react';
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent,
} from 'react';
import {
  getPlatformById,
  getPlatformDisplayName,
  getSupportedPlatforms,
  type PlatformDefinition,
  type PlatformId,
} from '../../config/platforms';
import { DiaTextReveal } from '../../components/DiaTextReveal';
import { formatNumber, i18n } from '../../i18n';
import { OPEN_OPTIONS_MESSAGE_TYPE } from '../../runtimeMessages';
import type { ColorScheme } from '../../theme/useColorScheme';
import type { FeedChannel } from '../../types/feed';
import { ThemeSwitch } from './ThemeSwitch';

type ReaderSurface = 'feed' | 'article' | 'thread';

const desktopItemClass = 'relative inline-flex min-h-11 items-center justify-center whitespace-nowrap border-0 bg-transparent px-[9px] text-[11px] leading-tight no-underline focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-onefeed-focus';
const mobileItemClass = 'flex min-h-12 w-full items-center justify-between border-0 border-b border-onefeed-line bg-transparent px-0 text-[13px] no-underline last:border-b-0 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-onefeed-focus';

interface PlatformBarProps {
  activePlatformId: string;
  channels: readonly FeedChannel[];
  platforms?: readonly PlatformDefinition[];
  onFeedChannelSelect?: (channelId: string) => boolean;
  surface: ReaderSurface;
  scrollElement: HTMLElement;
  colorScheme: ColorScheme;
  themeReady: boolean;
  hiddenItemCount?: number;
  initialSearchQuery?: string;
  onColorSchemeChange: (colorScheme: ColorScheme) => void;
  onSearch?: (query: string) => boolean;
}

export function PlatformBar({
  activePlatformId,
  channels,
  platforms = getSupportedPlatforms(),
  onFeedChannelSelect,
  surface,
  scrollElement,
  colorScheme,
  themeReady,
  hiddenItemCount = 0,
  initialSearchQuery,
  onColorSchemeChange,
  onSearch,
}: PlatformBarProps) {
  const activePlatform = getPlatformById(activePlatformId);
  const activeChannel = channels.find((channel) => channel.active);
  const [menuOpen, setMenuOpen] = useState(false);
  const [channelMenuOpen, setChannelMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(Boolean(initialSearchQuery));
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery || '');
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const channelButtonRef = useRef<HTMLButtonElement>(null);
  const channelMenuRef = useRef<HTMLSpanElement>(null);
  const searchButtonRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const focusSearchRef = useRef(false);

  useEffect(() => {
    if (!searchOpen || !focusSearchRef.current) return;
    focusSearchRef.current = false;
    searchInputRef.current?.focus();
    searchInputRef.current?.select();
  }, [searchOpen]);

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

  useEffect(() => {
    if (!channelMenuOpen) return undefined;

    const handlePointerDown = (event: PointerEvent) => {
      if (channelMenuRef.current && event.composedPath().includes(channelMenuRef.current)) return;
      setChannelMenuOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setChannelMenuOpen(false);
      channelButtonRef.current?.focus();
    };
    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [channelMenuOpen]);

  const closeMenu = () => {
    setMenuOpen(false);
    menuButtonRef.current?.focus();
  };

  const closeSearch = () => {
    setSearchOpen(false);
    setSearchQuery(initialSearchQuery || '');
    searchButtonRef.current?.focus();
  };

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = searchQuery.trim();
    if (query) onSearch?.(query);
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

  const handleChannelSelect = (channel: FeedChannel, mobile = false) => {
    if (channel.active) {
      scrollElement.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      onFeedChannelSelect?.(channel.id);
    }
    setChannelMenuOpen(false);
    if (mobile) setMenuOpen(false);
  };

  const openSettings = () => {
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) return;
    void chrome.runtime.sendMessage({ type: OPEN_OPTIONS_MESSAGE_TYPE })
      .catch(() => undefined);
  };

  const renderSupportedLinks = (mobile = false) => platforms.map((platform) => {
    const active = platform.id === activePlatformId;
    const displayName = getPlatformDisplayName(platform.id as PlatformId);
    const showDesktopChannelControl = active && !mobile && channels.length > 1;
    const platformLink = (
      <a
        className={`${mobile ? mobileItemClass : desktopItemClass} ${showDesktopChannelControl ? 'flex-col gap-[3px] pr-1.5' : ''} ${
          active
            ? mobile
              ? 'font-onefeed-emphasis text-onefeed-blue'
              : showDesktopChannelControl
                ? "font-onefeed-emphasis text-onefeed-blue after:absolute after:right-1 after:bottom-[-1px] after:left-2 after:h-0.5 after:bg-onefeed-blue after:content-['']"
                : "font-onefeed-emphasis text-onefeed-blue after:absolute after:right-2 after:bottom-[-1px] after:left-2 after:h-0.5 after:bg-onefeed-blue after:content-['']"
            : 'text-onefeed-muted hover:text-onefeed-blue'
        }`}
        href={platform.homeUrl}
        aria-current={active ? 'page' : undefined}
        onClick={(event) => handleSupportedClick(event, platform)}
      >
        <span className={showDesktopChannelControl ? 'leading-none' : undefined}>{displayName}</span>
        {showDesktopChannelControl && activeChannel && (
          <span
            data-onefeed-channel-label="true"
            className="max-w-[62px] overflow-hidden text-ellipsis text-[8px] leading-none font-normal tracking-[.04em] whitespace-nowrap text-onefeed-muted"
            aria-hidden="true"
          >
            {activeChannel.label}
          </span>
        )}
        {mobile && active && activeChannel && (
          <span className="text-[10px] font-normal text-onefeed-muted">
            {activeChannel.label}
          </span>
        )}
      </a>
    );

    if (!active || mobile || channels.length <= 1) {
      return <span key={platform.id} className="contents">{platformLink}</span>;
    }

    return (
      <span
        ref={channelMenuRef}
        key={platform.id}
        className="relative inline-flex items-stretch"
      >
        {platformLink}
        <button
          ref={channelButtonRef}
          className="mr-1 inline-flex w-5 cursor-pointer items-center justify-center self-stretch border-0 bg-transparent p-0 text-onefeed-blue transition-colors hover:text-onefeed-ink focus-visible:outline-3 focus-visible:outline-offset-[-3px] focus-visible:outline-onefeed-focus"
          type="button"
          aria-label={i18n.t('platformBar.switchChannel', [
            displayName,
            activeChannel?.label || i18n.t('common.unknown'),
          ])}
          aria-haspopup="menu"
          aria-expanded={channelMenuOpen}
          aria-controls="onefeed-channel-menu"
          onClick={() => setChannelMenuOpen((open) => !open)}
        >
          <CaretDown
            className={`transition-transform ${channelMenuOpen ? 'rotate-180' : ''}`}
            size={9}
            weight="bold"
            aria-hidden="true"
          />
        </button>
        {channelMenuOpen && (
          <span
            id="onefeed-channel-menu"
            className="absolute top-[58px] left-2 z-30 grid min-w-[116px] overflow-hidden rounded-[4px] border border-onefeed-line bg-onefeed-surface p-1 shadow-[0_12px_32px_rgb(15_22_34_/_16%)]"
            role="menu"
            aria-label={i18n.t('platformBar.channelMenu', [displayName])}
          >
            {channels.map((channel) => (
              <button
                key={channel.id}
                className={`flex min-h-8 cursor-pointer items-center justify-between gap-4 rounded-[2px] border-0 px-2.5 text-left text-[11px] focus-visible:outline-3 focus-visible:outline-offset-[-2px] focus-visible:outline-onefeed-focus ${
                  channel.active
                    ? 'bg-transparent font-onefeed-emphasis text-onefeed-blue'
                    : 'bg-transparent text-onefeed-muted hover:bg-onefeed-paper hover:text-onefeed-blue'
                }`}
                type="button"
                role="menuitemradio"
                aria-checked={channel.active}
                onClick={() => handleChannelSelect(channel)}
              >
                <span>{channel.label}</span>
                {channel.active && <Check size={11} weight="bold" aria-hidden="true" />}
              </button>
            ))}
          </span>
        )}
      </span>
    );
  });

  const activePlatformName = activePlatform
    ? getPlatformDisplayName(activePlatform.id as PlatformId)
    : undefined;

  return (
    <header className="sticky top-0 z-20 border-b border-onefeed-line bg-onefeed-paper/95 backdrop-blur-md">
      <div className="mx-auto flex h-[52px] w-full max-w-[1040px] items-stretch gap-7 px-12 max-[720px]:h-14 max-[720px]:justify-between max-[720px]:px-4">
        <a
          className={`inline-flex shrink-0 items-center font-onefeed-brand text-sm font-onefeed-emphasis tracking-[.03em] text-onefeed-ink no-underline focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-onefeed-focus ${searchOpen ? 'max-[420px]:hidden' : ''}`}
          href={activePlatform?.homeUrl || '#'}
        >
          <DiaTextReveal text="OneFeed" />
        </a>

        {searchOpen && onSearch ? (
          <form
            className="flex min-w-0 flex-1 items-center gap-3 max-[720px]:gap-2"
            role="search"
            aria-label={i18n.t('platformBar.searchForm', [
              activePlatformName || i18n.t('common.currentWebsite'),
            ])}
            onSubmit={handleSearchSubmit}
          >
            <label
              className="shrink-0 font-onefeed-brand text-[9px] tracking-[.12em] text-onefeed-blue max-[720px]:sr-only"
              htmlFor="onefeed-site-search"
            >
              {i18n.t('platformBar.searchScope', [
                activePlatformName || i18n.t('common.currentWebsite'),
              ])}
            </label>
            <span className="flex min-w-0 flex-1 items-center gap-2 border-b border-onefeed-line-strong focus-within:border-onefeed-blue">
              <MagnifyingGlass className="shrink-0 text-onefeed-muted" size={14} aria-hidden="true" />
              <input
                ref={searchInputRef}
                id="onefeed-site-search"
                className="h-9 min-w-0 flex-1 border-0 bg-transparent p-0 text-[13px] text-onefeed-ink outline-none placeholder:text-onefeed-faint"
                type="search"
                value={searchQuery}
                placeholder={i18n.t('platformBar.searchPlaceholder', [
                  activePlatformName || i18n.t('common.currentWebsite'),
                ])}
                required
                onChange={(event) => setSearchQuery(event.currentTarget.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') closeSearch();
                }}
              />
            </span>
            <button
              className="min-h-9 shrink-0 cursor-pointer border-0 bg-transparent px-1 text-[11px] font-onefeed-emphasis text-onefeed-blue focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-onefeed-focus"
              type="submit"
            >
              {i18n.t('platformBar.searchSubmit')}
            </button>
          </form>
        ) : (
          <nav className="flex min-w-0 items-stretch gap-1 max-[720px]:hidden" aria-label={i18n.t('platformBar.switchPlatform')}>
            {renderSupportedLinks()}
          </nav>
        )}

        <div className="ml-auto flex shrink-0 items-center gap-2">
          {hiddenItemCount > 0 && !searchOpen && (
            <span
              className="inline-flex items-center gap-1 text-[9px] leading-none tabular-nums text-onefeed-faint"
              role="status"
              aria-label={i18n.t(
                'platformBar.hiddenContent',
                hiddenItemCount,
                [formatNumber(hiddenItemCount)],
              )}
              title={i18n.t(
                'platformBar.hiddenContent',
                hiddenItemCount,
                [formatNumber(hiddenItemCount)],
              )}
            >
              <EyeSlash size={12} aria-hidden="true" />
              <span aria-hidden="true">{formatNumber(hiddenItemCount)}</span>
            </span>
          )}
          {onSearch && (
            <button
              ref={searchButtonRef}
              className={`grid size-8 shrink-0 cursor-pointer place-items-center rounded-md border-0 bg-transparent p-0 transition-colors duration-150 hover:bg-onefeed-blue-soft focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-onefeed-focus ${searchOpen || initialSearchQuery ? 'text-onefeed-blue' : 'text-onefeed-ink'}`}
              type="button"
              aria-label={searchOpen
                ? i18n.t('platformBar.closeSearch')
                : i18n.t('platformBar.openSearch', [
                    activePlatformName || i18n.t('common.currentWebsite'),
                  ])}
              aria-expanded={searchOpen}
              aria-controls={searchOpen ? 'onefeed-site-search' : undefined}
              onClick={() => {
                if (searchOpen) {
                  closeSearch();
                  return;
                }
                setMenuOpen(false);
                setChannelMenuOpen(false);
                focusSearchRef.current = true;
                setSearchOpen(true);
              }}
            >
              {searchOpen
                ? <X size={16} weight="bold" aria-hidden="true" />
                : <MagnifyingGlass size={16} aria-hidden="true" />}
            </button>
          )}
          <span className="h-4 w-px shrink-0 bg-onefeed-line" aria-hidden="true" />
          <ThemeSwitch
            colorScheme={colorScheme}
            disabled={!themeReady}
            onChange={onColorSchemeChange}
          />
          {!searchOpen && <button
            ref={menuButtonRef}
            className="ml-2 hidden cursor-pointer items-center gap-3 border-0 bg-transparent p-0 text-[11px] focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-onefeed-focus max-[720px]:inline-flex max-[420px]:ml-1 max-[420px]:gap-1.5"
            type="button"
            aria-expanded={menuOpen}
            aria-controls="onefeed-platform-menu"
            onClick={() => {
              setChannelMenuOpen(false);
              setMenuOpen(true);
            }}
          >
            <span className="text-onefeed-muted max-[420px]:hidden">
              {i18n.t('platformBar.current', [
                activePlatformName || i18n.t('common.unknown'),
              ])}
            </span>
            <strong className="text-[11px] font-onefeed-emphasis text-onefeed-blue">
              {i18n.t('platformBar.switchPlatform')}
            </strong>
          </button>}
          <button
            className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-md border-0 bg-transparent p-0 text-onefeed-ink transition-colors duration-150 hover:bg-onefeed-blue-soft hover:text-onefeed-blue focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-onefeed-focus"
            type="button"
            aria-label={i18n.t('platformBar.openSettings')}
            onClick={openSettings}
          >
            <GearSix size={17} aria-hidden="true" />
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="fixed inset-0 z-30 hidden max-[720px]:block">
          <button
            className="absolute inset-0 h-full w-full border-0 bg-onefeed-overlay/48 p-0"
            type="button"
            aria-label={i18n.t('platformBar.closeMenu')}
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
                {i18n.t('platformBar.switchPlatform')}
              </strong>
              <button
                ref={closeButtonRef}
                className="min-h-9 cursor-pointer border-0 bg-transparent px-1 text-xs text-onefeed-blue focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-onefeed-focus"
                type="button"
                onClick={closeMenu}
              >
                {i18n.t('common.close')}
              </button>
            </div>
            <p className="mt-[18px] mb-[5px] text-[10px] tracking-[.08em] text-onefeed-muted">
              {i18n.t('platformBar.supported')}
            </p>
            <nav className="grid" aria-label={i18n.t('platformBar.supportedPlatforms')}>
              {renderSupportedLinks(true)}
            </nav>
            {channels.length > 1 && (
              <>
                <p className="mt-[18px] mb-[8px] text-[10px] tracking-[.08em] text-onefeed-muted">
                  {i18n.t('platformBar.websiteChannels', [
                    activePlatformName || i18n.t('common.currentWebsite'),
                  ])}
                </p>
                <div className="grid grid-cols-2 gap-2" role="group" aria-label={i18n.t('platformBar.switchFeedChannel')}>
                  {channels.map((channel) => (
                    <button
                      key={channel.id}
                      className={`min-h-10 cursor-pointer rounded-[3px] border px-3 text-left text-xs focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-onefeed-focus ${
                        channel.active
                          ? 'border-onefeed-blue bg-onefeed-blue-soft font-onefeed-emphasis text-onefeed-blue'
                          : 'border-onefeed-line bg-transparent text-onefeed-muted'
                      }`}
                      type="button"
                      aria-pressed={channel.active}
                      onClick={() => handleChannelSelect(channel, true)}
                    >
                      {channel.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </header>
  );
}
