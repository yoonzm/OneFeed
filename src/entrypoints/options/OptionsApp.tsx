import { Article, Browser, Funnel, MoonStars, Sun } from '@phosphor-icons/react';
import { i18n } from '../../i18n';
import { useDisplayPreferences } from '../../preferences/useDisplayPreferences';
import { useColorScheme } from '../../theme/useColorScheme';
import { SettingsLayout, type SettingsCategory } from './components/SettingsLayout';
import { Button } from './components/ui/Button';
import { ContentDisplaySettingsPanel } from './ContentDisplaySettingsPanel';
import { FilterSettingsPanel } from './FilterSettingsPanel';
import { HeaderSettingsPanel } from './HeaderSettingsPanel';

export function OptionsApp() {
  const { colorScheme, ready, setColorScheme } = useColorScheme();
  const displayPreferences = useDisplayPreferences();
  const nextColorScheme = colorScheme === 'light' ? 'dark' : 'light';
  const categories: SettingsCategory[] = [
    {
      id: 'header',
      label: i18n.t('settings.header'),
      description: i18n.t('settings.headerDescription'),
      icon: <Browser size={19} />,
      content: <HeaderSettingsPanel {...displayPreferences} />,
    },
    {
      id: 'content-display',
      label: i18n.t('settings.contentDisplay'),
      description: i18n.t('settings.contentDisplayDescription'),
      icon: <Article size={19} />,
      content: <ContentDisplaySettingsPanel {...displayPreferences} />,
    },
    {
      id: 'filters',
      label: i18n.t('settings.filters'),
      description: i18n.t('settings.filtersDescription'),
      icon: <Funnel size={19} />,
      content: <FilterSettingsPanel />,
    },
  ];

  return (
    <div className="options-page" data-onefeed-theme={colorScheme}>
      <a className="skip-link" href="#settings-main">{i18n.t('filter.skip')}</a>
      <header className="options-header">
        <div className="options-brand">
          <img src="/icons/icon-128.png" alt="" />
          <span>OneFeed</span>
        </div>
        <Button
          className="theme-button"
          type="button"
          variant="ghost"
          size="icon"
          aria-label={nextColorScheme === 'dark'
            ? i18n.t('common.themeSwitchDark')
            : i18n.t('common.themeSwitchLight')}
          disabled={!ready}
          onClick={() => setColorScheme(nextColorScheme)}
        >
          {colorScheme === 'light' ? <MoonStars size={21} /> : <Sun size={21} />}
        </Button>
      </header>

      <main id="settings-main" className="options-main">
        <SettingsLayout categories={categories} />
      </main>
    </div>
  );
}
