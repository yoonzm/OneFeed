import { Image } from '@phosphor-icons/react';
import { i18n } from '../../i18n';
import type { DisplayPreferences } from '../../preferences/displayPreferences';
import type { DisplayPreferencesUpdate } from '../../preferences/useDisplayPreferences';
import { SettingsPanelHeader } from './components/SettingsLayout';
import { Card, CardContent, CardHeader } from './components/ui/Card';
import { Switch } from './components/ui/Switch';

interface ContentDisplaySettingsPanelProps {
  preferences: DisplayPreferences;
  ready: boolean;
  savePreferences: (update: DisplayPreferencesUpdate) => void;
}

export function ContentDisplaySettingsPanel({
  preferences,
  ready,
  savePreferences,
}: ContentDisplaySettingsPanelProps) {
  return (
    <>
      <SettingsPanelHeader
        title={i18n.t('settings.contentDisplay')}
        description={i18n.t('settings.contentDisplayPanelDescription')}
      />

      <section className="display-section" aria-labelledby="content-display-title">
        <div className="section-title">
          <div>
            <p>{i18n.t('display.contentEyebrow')}</p>
            <h2 id="content-display-title">{i18n.t('display.contentTitle')}</h2>
          </div>
        </div>
        <Card as="article" className="image-settings-card">
          <CardHeader>
            <span className="image-settings-icon" aria-hidden="true">
              <Image size={23} />
            </span>
            <div>
              <h3>{i18n.t('display.imageTitle')}</h3>
              <p>{i18n.t('display.imageDescription')}</p>
            </div>
          </CardHeader>
          <CardContent className="image-setting-list">
            <div className="image-setting-row">
              <div>
                <strong>{i18n.t('display.feedImages')}</strong>
                <span>{i18n.t('display.feedImagesDescription')}</span>
              </div>
              <Switch
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
              <Switch
                checked={!preferences.hideDetailImages}
                label={i18n.t('display.detailImagesToggle')}
                disabled={!ready}
                onCheckedChange={(showImages) => savePreferences({
                  ...preferences,
                  hideDetailImages: !showImages,
                })}
              />
            </div>
          </CardContent>
        </Card>
      </section>
    </>
  );
}
