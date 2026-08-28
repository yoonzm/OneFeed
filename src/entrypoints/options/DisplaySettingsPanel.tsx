import { ArrowDown, ArrowUp, Image } from '@phosphor-icons/react';
import { useMemo, type CSSProperties } from 'react';
import { PlatformIcon } from '../../components/PlatformIcon';
import { getPlatformPresentation } from '../../config/platformPresentation';
import {
  getPlatformDisplayName,
  getSupportedPlatforms,
  type PlatformId,
} from '../../config/platforms';
import { i18n } from '../../i18n';
import { DEFAULT_DISPLAY_PREFERENCES } from '../../preferences/displayPreferences';
import { useDisplayPreferences } from '../../preferences/useDisplayPreferences';
import { SettingSwitch } from './components/SettingSwitch';
import { SettingsPanelHeader } from './components/SettingsLayout';

export function DisplaySettingsPanel() {
  const { preferences, ready, savePreferences } = useDisplayPreferences();
  const orderedPlatforms = useMemo(() => {
    const supportedPlatforms = getSupportedPlatforms();
    const platformById = new Map(supportedPlatforms.map((platform) => [platform.id, platform]));
    return preferences.headerPlatformOrder
      .map((id) => platformById.get(id))
      .filter((platform) => platform !== undefined);
  }, [preferences.headerPlatformOrder]);

  const movePlatform = (platformId: PlatformId, offset: -1 | 1) => {
    savePreferences((current) => {
      const index = current.headerPlatformOrder.indexOf(platformId);
      const targetIndex = index + offset;
      if (index < 0 || targetIndex < 0 || targetIndex >= current.headerPlatformOrder.length) {
        return current;
      }
      const headerPlatformOrder = [...current.headerPlatformOrder];
      [headerPlatformOrder[index], headerPlatformOrder[targetIndex]] = [
        headerPlatformOrder[targetIndex]!,
        headerPlatformOrder[index]!,
      ];
      return { ...current, headerPlatformOrder };
    });
  };

  const setPlatformVisible = (platformId: PlatformId, visible: boolean) => {
    savePreferences((current) => ({
      ...current,
      hiddenHeaderPlatformIds: visible
        ? current.hiddenHeaderPlatformIds.filter((id) => id !== platformId)
        : [...current.hiddenHeaderPlatformIds, platformId],
    }));
  };

  return (
    <>
      <SettingsPanelHeader
        title={i18n.t('settings.appearance')}
        description={i18n.t('settings.appearancePanelDescription')}
      />

      <section className="display-section" aria-labelledby="display-title">
        <div className="section-title">
          <div>
            <p>{i18n.t('display.headerEyebrow')}</p>
            <h2 id="display-title">{i18n.t('display.headerTitle')}</h2>
          </div>
        </div>
        <div className="display-grid">
          <article className="platform-order-card">
            <header>
              <div>
                <h3>{i18n.t('display.headerPlatforms')}</h3>
                <p>{i18n.t('display.headerDescription')}</p>
              </div>
              <button
                className="reset-order-button"
                type="button"
                disabled={!ready}
                onClick={() => savePreferences((current) => ({
                  ...current,
                  headerPlatformOrder: [...DEFAULT_DISPLAY_PREFERENCES.headerPlatformOrder],
                }))}
              >
                {i18n.t('display.resetOrder')}
              </button>
            </header>
            <ol className="header-platform-list">
              {orderedPlatforms.map((platform, index) => {
                const platformId = platform.id as PlatformId;
                const displayName = getPlatformDisplayName(platformId);
                const presentation = getPlatformPresentation(platformId);
                const visible = !preferences.hiddenHeaderPlatformIds.includes(platformId);
                return (
                  <li
                    className={`header-platform-row ${visible ? '' : 'is-hidden'}`}
                    data-platform-id={platform.id}
                    key={platform.id}
                    style={{ '--platform-accent': presentation.accent } as CSSProperties}
                  >
                    <span className="platform-order-number" aria-hidden="true">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="header-platform-icon" aria-hidden="true">
                      <PlatformIcon platformId={platformId} />
                    </span>
                    <span className="header-platform-name">{displayName}</span>
                    <span className="platform-order-actions">
                      <button
                        className="move-up"
                        type="button"
                        aria-label={i18n.t('display.moveUp', [displayName])}
                        disabled={!ready || index === 0}
                        onClick={() => movePlatform(platformId, -1)}
                      >
                        <ArrowUp size={15} weight="bold" aria-hidden="true" />
                      </button>
                      <button
                        className="move-down"
                        type="button"
                        aria-label={i18n.t('display.moveDown', [displayName])}
                        disabled={!ready || index === orderedPlatforms.length - 1}
                        onClick={() => movePlatform(platformId, 1)}
                      >
                        <ArrowDown size={15} weight="bold" aria-hidden="true" />
                      </button>
                    </span>
                    <SettingSwitch
                      checked={visible}
                      label={i18n.t('display.showPlatform', [displayName])}
                      disabled={!ready}
                      onCheckedChange={(checked) => setPlatformVisible(platformId, checked)}
                    />
                  </li>
                );
              })}
            </ol>
            <p className="active-platform-note">{i18n.t('display.activePlatformNote')}</p>
          </article>

          <article className="image-settings-card">
            <header>
              <span className="image-settings-icon" aria-hidden="true">
                <Image size={23} />
              </span>
              <div>
                <h3>{i18n.t('display.imageTitle')}</h3>
                <p>{i18n.t('display.imageDescription')}</p>
              </div>
            </header>
            <div className="image-setting-list">
              <div className="image-setting-row">
                <div>
                  <strong>{i18n.t('display.feedImages')}</strong>
                  <span>{i18n.t('display.feedImagesDescription')}</span>
                </div>
                <SettingSwitch
                  checked={!preferences.hideFeedImages}
                  label={i18n.t('display.feedImagesToggle')}
                  disabled={!ready}
                  onCheckedChange={(showImages) => savePreferences({
                    ...preferences,
                    hideFeedImages: !showImages,
                  })}
                />
              </div>
              <div className="image-setting-row">
                <div>
                  <strong>{i18n.t('display.detailImages')}</strong>
                  <span>{i18n.t('display.detailImagesDescription')}</span>
                </div>
                <SettingSwitch
                  checked={!preferences.hideDetailImages}
                  label={i18n.t('display.detailImagesToggle')}
                  disabled={!ready}
                  onCheckedChange={(showImages) => savePreferences({
                    ...preferences,
                    hideDetailImages: !showImages,
                  })}
                />
              </div>
            </div>
          </article>
        </div>
      </section>
    </>
  );
}
