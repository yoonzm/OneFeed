import { Funnel, MoonStars, SlidersHorizontal, Sun } from '@phosphor-icons/react';
import { i18n } from '../../i18n';
import { useColorScheme } from '../../theme/useColorScheme';
import { SettingsLayout, type SettingsCategory } from './components/SettingsLayout';
import { DisplaySettingsPanel } from './DisplaySettingsPanel';
import { FilterSettingsPanel } from './FilterSettingsPanel';

export function OptionsApp() {
  const { colorScheme, ready, setColorScheme } = useColorScheme();
  const nextColorScheme = colorScheme === 'light' ? 'dark' : 'light';
  const categories: SettingsCategory[] = [
    {
      id: 'appearance',
      label: i18n.t('settings.appearance'),
      description: i18n.t('settings.appearanceDescription'),
      icon: <SlidersHorizontal size={19} />,
      content: <DisplaySettingsPanel />,
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
        <button
          className="theme-button"
          type="button"
          aria-label={nextColorScheme === 'dark'
            ? i18n.t('common.themeSwitchDark')
            : i18n.t('common.themeSwitchLight')}
          disabled={!ready}
          onClick={() => setColorScheme(nextColorScheme)}
        >
          {colorScheme === 'light' ? <MoonStars size={21} /> : <Sun size={21} />}
        </button>
      </header>

      <main id="settings-main" className="options-main">
        <SettingsLayout categories={categories} />
      </main>
    </div>
  );
}
