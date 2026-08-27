import {
  ArrowRight,
  GearSix,
  Info,
  MoonStars,
  Sun,
} from '@phosphor-icons/react';
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import {
  getPlatformPresentation,
} from '../../config/platformPresentation';
import {
  getPlatformById,
  getPlatformDisplayName,
  getPlannedPlatforms,
  getSupportedPlatforms,
  type PlatformId,
} from '../../config/platforms';
import { DiaTextReveal } from '../../components/DiaTextReveal';
import { PlatformIcon } from '../../components/PlatformIcon';
import { i18n } from '../../i18n';
import { useColorScheme } from '../../theme/useColorScheme';
import {
  DEFAULT_RECENT_PLATFORM_IDS,
  movePlatformToRecent,
  normalizeRecentPlatformIds,
} from './recentPlatforms';

const GITHUB_URL = 'https://github.com/yoonzm/OneFeed';
const ISSUE_URL = `${GITHUB_URL}/issues`;

function getExtensionStorage(): typeof chrome.storage | undefined {
  return typeof chrome === 'undefined' ? undefined : chrome.storage;
}

function useEnabledState() {
  const [enabled, setEnabledState] = useState(true);

  useEffect(() => {
    const storage = getExtensionStorage();
    if (!storage) return;

    let active = true;
    const handleStorageChange = (
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: string,
    ) => {
      if (areaName !== 'local' || !changes.enabled) return;
      setEnabledState(changes.enabled.newValue !== false);
    };

    storage.local.get({ enabled: true }, ({ enabled: storedEnabled }) => {
      if (active) setEnabledState(storedEnabled !== false);
    });
    storage.onChanged.addListener(handleStorageChange);

    return () => {
      active = false;
      storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  const setEnabled = (nextEnabled: boolean) => {
    setEnabledState(nextEnabled);
    getExtensionStorage()?.local.set({ enabled: nextEnabled });
  };

  return { enabled, setEnabled };
}

function useRecentPlatforms() {
  const [recentPlatformIds, setRecentPlatformIds] = useState<PlatformId[]>(
    DEFAULT_RECENT_PLATFORM_IDS,
  );

  useEffect(() => {
    const storage = getExtensionStorage();
    if (!storage) return;

    storage.local.get(
      { recentPlatformIds: DEFAULT_RECENT_PLATFORM_IDS },
      ({ recentPlatformIds }) => {
        setRecentPlatformIds(normalizeRecentPlatformIds(recentPlatformIds));
      },
    );
  }, []);

  const rememberPlatform = (id: PlatformId) => {
    setRecentPlatformIds((current) => {
      const next = movePlatformToRecent(current, id);
      getExtensionStorage()?.local.set({ recentPlatformIds: next });
      return next;
    });
  };

  return { recentPlatformIds, rememberPlatform };
}

function openExtensionSettings() {
  if (typeof chrome === 'undefined' || !chrome.runtime?.openOptionsPage) return;
  void chrome.runtime.openOptionsPage();
}

export function BoardApp() {
  const { colorScheme, ready, setColorScheme } = useColorScheme();
  const { enabled, setEnabled } = useEnabledState();
  const { recentPlatformIds, rememberPlatform } = useRecentPlatforms();
  const supportedPlatforms = useMemo(() => getSupportedPlatforms(), []);
  const plannedPlatforms = useMemo(() => getPlannedPlatforms(), []);
  const primaryPlatformId = recentPlatformIds[0] ?? 'zhihu';
  const primaryPlatform = getPlatformById(primaryPlatformId)!;
  const secondaryPlatforms = recentPlatformIds
    .slice(1)
    .map((id) => getPlatformById(id)!)
    .filter(Boolean);
  const recentIds = new Set(recentPlatformIds);
  const morePlatforms = supportedPlatforms.filter((platform) => !recentIds.has(platform.id as PlatformId));
  const nextColorScheme = colorScheme === 'light' ? 'dark' : 'light';

  return (
    <div className="board-page" data-onefeed-theme={colorScheme}>
      <a className="skip-link" href="#main">{i18n.t('common.skipToMain')}</a>

      <header className="board-header">
        <a className="board-brand" href="#main" aria-label={i18n.t('board.homeLabel')}>
          <img src="/icons/icon-128.png" alt="" />
          <DiaTextReveal text="OneFeed" />
        </a>

        <div className="header-actions">
          <button
            className={`enabled-control ${enabled ? 'is-enabled' : ''}`}
            type="button"
            role="switch"
            aria-checked={enabled}
            onClick={() => setEnabled(!enabled)}
          >
            <span className="enabled-label">
              <i aria-hidden="true" />
              {i18n.t('board.status', [
                enabled ? i18n.t('common.enabled') : i18n.t('common.paused'),
              ])}
            </span>
            <span className="switch-track" aria-hidden="true"><i /></span>
          </button>

          <button
            className="icon-action"
            type="button"
            aria-label={nextColorScheme === 'dark'
              ? i18n.t('common.themeSwitchDark')
              : i18n.t('common.themeSwitchLight')}
            title={nextColorScheme === 'dark'
              ? i18n.t('common.themeSwitchDark')
              : i18n.t('common.themeSwitchLight')}
            disabled={!ready}
            onClick={() => setColorScheme(nextColorScheme)}
          >
            {colorScheme === 'light' ? <MoonStars size={25} /> : <Sun size={25} />}
          </button>

          <button className="settings-action" type="button" onClick={openExtensionSettings}>
            <GearSix size={23} />
            <span>{i18n.t('common.settings')}</span>
          </button>
        </div>
      </header>

      <main className="board-main" id="main">
        <section className="board-intro" aria-labelledby="board-title">
          <h1 id="board-title">{i18n.t('board.introTitle')}</h1>
          <p>{i18n.t('board.introDescription')}</p>
        </section>

        <section className="resume-section" aria-label={i18n.t('board.resume')}>
          <div className="resume-platform">
            <span
              className="platform-mark resume-mark"
              aria-hidden="true"
              style={{
                '--platform-accent': getPlatformPresentation(primaryPlatform.id as PlatformId).accent,
              } as CSSProperties}
            >
              <PlatformIcon platformId={primaryPlatform.id as PlatformId} />
            </span>
            <span className="resume-copy">
              <strong>{getPlatformDisplayName(primaryPlatform.id as PlatformId)}</strong>
              <span>{getPlatformPresentation(primaryPlatform.id as PlatformId).scope}</span>
            </span>
          </div>
          <a
            className="resume-action"
            href={primaryPlatform.homeUrl}
            onClick={() => rememberPlatform(primaryPlatform.id as PlatformId)}
            style={{
              '--platform-accent': getPlatformPresentation(primaryPlatform.id as PlatformId).accent,
            } as CSSProperties}
          >
            {i18n.t('board.openPlatform', [
              getPlatformDisplayName(primaryPlatform.id as PlatformId),
            ])}
            <ArrowRight size={23} weight="regular" aria-hidden="true" />
          </a>
          <p className={`state-note ${enabled ? '' : 'is-paused'}`}>
            <Info size={20} aria-hidden="true" />
            {enabled
              ? i18n.t('board.enabledNote')
              : i18n.t('board.pausedNote')}
          </p>
        </section>

        <section className="platform-section" aria-labelledby="recent-title">
          <h2 id="recent-title">{i18n.t('board.recent')}</h2>
          <div className="recent-list">
            {secondaryPlatforms.map((platform) => {
              const presentation = getPlatformPresentation(platform.id as PlatformId);
              return (
                <a
                  className={`recent-row platform-${platform.id}`}
                  href={platform.homeUrl}
                  key={platform.id}
                  onClick={() => rememberPlatform(platform.id as PlatformId)}
                  style={{ '--platform-accent': presentation.accent } as CSSProperties}
                >
                  <span className="platform-mark" aria-hidden="true">
                    <PlatformIcon platformId={platform.id as PlatformId} />
                  </span>
                  <span>
                    <strong>{getPlatformDisplayName(platform.id as PlatformId)}</strong>
                    <small>{presentation.scope}</small>
                  </span>
                  <ArrowRight className="card-arrow" size={21} aria-hidden="true" />
                </a>
              );
            })}
          </div>
        </section>

        <section className="platform-section more-section" aria-labelledby="more-title">
          <h2 id="more-title">{i18n.t('board.more')}</h2>
          <div className="more-grid">
            {morePlatforms.map((platform) => {
              const presentation = getPlatformPresentation(platform.id as PlatformId);
              return (
                <a
                  className={`more-card platform-${platform.id}`}
                  href={platform.homeUrl}
                  key={platform.id}
                  onClick={() => rememberPlatform(platform.id as PlatformId)}
                  style={{ '--platform-accent': presentation.accent } as CSSProperties}
                >
                  <span className="platform-mark" aria-hidden="true">
                    <PlatformIcon platformId={platform.id as PlatformId} />
                  </span>
                  <span>
                    <strong>{getPlatformDisplayName(platform.id as PlatformId)}</strong>
                    <small>{presentation.scope}</small>
                  </span>
                  <ArrowRight className="card-arrow" size={19} aria-hidden="true" />
                </a>
              );
            })}
          </div>
        </section>
      </main>

      <footer className="board-footer">
        <p>
          {i18n.t('board.planned', [plannedPlatforms.map((platform) => (
            getPlatformDisplayName(platform.id as PlatformId)
          )).join(' · ')])}
        </p>
        <nav aria-label={i18n.t('common.helpLinks')}>
          <a href={GITHUB_URL}>{i18n.t('board.guide')}</a>
          <a href={ISSUE_URL}>{i18n.t('board.feedback')}</a>
        </nav>
      </footer>
    </div>
  );
}
