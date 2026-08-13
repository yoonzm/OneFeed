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
  getPlannedPlatforms,
  getSupportedPlatforms,
  type PlatformId,
} from '../../config/platforms';
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
  if (typeof chrome === 'undefined' || !chrome.tabs || !chrome.runtime?.id) return;
  void chrome.tabs.create({ url: `chrome://extensions/?id=${chrome.runtime.id}` });
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
      <a className="skip-link" href="#main">跳到主要内容</a>

      <header className="board-header">
        <a className="board-brand" href="#main" aria-label="OneFeed 启动中心首页">
          <img src="/icons/icon-128.png" alt="" />
          <span>OneFeed</span>
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
              OneFeed {enabled ? '已开启' : '已暂停'}
            </span>
            <span className="switch-track" aria-hidden="true"><i /></span>
          </button>

          <button
            className="icon-action"
            type="button"
            aria-label={`切换到${nextColorScheme === 'dark' ? '深色' : '浅色'}主题`}
            title={`切换到${nextColorScheme === 'dark' ? '深色' : '浅色'}主题`}
            disabled={!ready}
            onClick={() => setColorScheme(nextColorScheme)}
          >
            {colorScheme === 'light' ? <MoonStars size={25} /> : <Sun size={25} />}
          </button>

          <button className="settings-action" type="button" onClick={openExtensionSettings}>
            <GearSix size={23} />
            <span>设置</span>
          </button>
        </div>
      </header>

      <main className="board-main" id="main">
        <section className="board-intro" aria-labelledby="board-title">
          <h1 id="board-title">继续上次的阅读。</h1>
          <p>选择一个网站，继续你的专注阅读。</p>
        </section>

        <section className="resume-section" aria-label="继续阅读">
          <div className="resume-platform">
            <span
              className="platform-mark resume-mark"
              aria-hidden="true"
              style={{
                '--platform-accent': getPlatformPresentation(primaryPlatform.id as PlatformId).accent,
              } as CSSProperties}
            >
              {getPlatformPresentation(primaryPlatform.id as PlatformId).mark}
            </span>
            <span className="resume-copy">
              <strong>{primaryPlatform.name}</strong>
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
            打开{primaryPlatform.name}
            <ArrowRight size={23} weight="regular" aria-hidden="true" />
          </a>
          <p className={`state-note ${enabled ? '' : 'is-paused'}`}>
            <Info size={20} aria-hidden="true" />
            {enabled
              ? '暂停后，所有网站立即恢复原页面。'
              : 'OneFeed 已暂停，打开网站后将显示原页面。'}
          </p>
        </section>

        <section className="platform-section" aria-labelledby="recent-title">
          <h2 id="recent-title">最近使用</h2>
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
                  <span className="platform-mark" aria-hidden="true">{presentation.mark}</span>
                  <span>
                    <strong>{platform.name}</strong>
                    <small>{presentation.scope}</small>
                  </span>
                  <ArrowRight className="card-arrow" size={21} aria-hidden="true" />
                </a>
              );
            })}
          </div>
        </section>

        <section className="platform-section more-section" aria-labelledby="more-title">
          <h2 id="more-title">更多网站</h2>
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
                  <span className="platform-mark" aria-hidden="true">{presentation.mark}</span>
                  <span>
                    <strong>{platform.name}</strong>
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
          即将支持：{plannedPlatforms.map((platform) => platform.name).join(' · ')}
        </p>
        <nav aria-label="帮助链接">
          <a href={GITHUB_URL}>使用指南</a>
          <a href={ISSUE_URL}>反馈</a>
        </nav>
      </footer>
    </div>
  );
}
