import { CaretDown, Check, EyeSlash } from '@phosphor-icons/react';
import { useEffect, useRef, useState, type MouseEvent } from 'react';
import {
  getPlannedPlatforms,
  getPlatformById,
  getSupportedPlatforms,
  type PlatformDefinition,
} from '../../config/platforms';
import { DiaTextReveal } from '../../components/DiaTextReveal';
import type { ColorScheme } from '../../theme/useColorScheme';
import type { FeedChannel } from '../../types/feed';
import { GitHubLink } from './GitHubLink';
import { ThemeSwitch } from './ThemeSwitch';

type ReaderSurface = 'feed' | 'article' | 'thread';

const desktopItemClass = 'relative inline-flex min-h-11 items-center justify-center whitespace-nowrap border-0 bg-transparent px-[9px] text-[11px] leading-tight no-underline focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-onefeed-focus';
const mobileItemClass = 'flex min-h-12 w-full items-center justify-between border-0 border-b border-onefeed-line bg-transparent px-0 text-[13px] no-underline last:border-b-0 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-onefeed-focus';

interface PlatformBarProps {
  activePlatformId: string;
  channels: readonly FeedChannel[];
  onFeedChannelSelect?: (channelId: string) => boolean;
  surface: ReaderSurface;
  scrollElement: HTMLElement;
  colorScheme: ColorScheme;
  themeReady: boolean;
  hiddenItemCount?: number;
  onColorSchemeChange: (colorScheme: ColorScheme) => void;
}

export function PlatformBar({
  activePlatformId,
  channels,
  onFeedChannelSelect,
  surface,
  scrollElement,
  colorScheme,
  themeReady,
  hiddenItemCount = 0,
  onColorSchemeChange,
}: PlatformBarProps) {
  const supportedPlatforms = getSupportedPlatforms();
  const plannedPlatforms = getPlannedPlatforms();
  const activePlatform = getPlatformById(activePlatformId);
  const activeChannel = channels.find((channel) => channel.active);
  const [menuOpen, setMenuOpen] = useState(false);
  const [channelMenuOpen, setChannelMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const channelButtonRef = useRef<HTMLButtonElement>(null);
  const channelMenuRef = useRef<HTMLSpanElement>(null);

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

  const renderSupportedLinks = (mobile = false) => supportedPlatforms.map((platform) => {
    const active = platform.id === activePlatformId;
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
        <span className={showDesktopChannelControl ? 'leading-none' : undefined}>{platform.name}</span>
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
          aria-label={`切换${platform.name}频道，当前${activeChannel?.label || '未识别'}`}
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
            aria-label={`${platform.name}信息流频道`}
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
          <DiaTextReveal text="OneFeed" />
        </a>

        <nav className="flex min-w-0 items-stretch gap-1 max-[720px]:hidden" aria-label="切换平台">
          {renderSupportedLinks()}
          <span className="mx-1.5 my-auto h-[18px] w-px bg-onefeed-line" aria-hidden="true" />
          {renderPlannedItems()}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          {hiddenItemCount > 0 && (
            <span
              className="inline-flex items-center gap-1 text-[9px] leading-none tabular-nums text-onefeed-faint"
              role="status"
              aria-label={`已隐藏 ${hiddenItemCount} 条内容`}
              title={`已隐藏 ${hiddenItemCount} 条内容`}
            >
              <EyeSlash size={12} aria-hidden="true" />
              <span aria-hidden="true">{hiddenItemCount}</span>
            </span>
          )}
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
            onClick={() => {
              setChannelMenuOpen(false);
              setMenuOpen(true);
            }}
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
            {channels.length > 1 && (
              <>
                <p className="mt-[18px] mb-[8px] text-[10px] tracking-[.08em] text-onefeed-muted">
                  {activePlatform?.name || '当前网站'}频道
                </p>
                <div className="grid grid-cols-2 gap-2" role="group" aria-label="切换信息流频道">
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
