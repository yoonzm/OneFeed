import type { ColorScheme } from '../theme/useColorScheme';
import { i18n } from '../i18n';

interface FloatingToggleProps {
  enabled: boolean;
  ready: boolean;
  colorScheme?: ColorScheme;
  onToggle: () => void;
}

export function FloatingToggle({
  enabled,
  ready,
  colorScheme = 'light',
  onToggle,
}: FloatingToggleProps) {
  const label = enabled
    ? i18n.t('toggle.disableLabel')
    : i18n.t('toggle.enableLabel');

  return (
    <div className="floating-toggle" data-onefeed-theme={colorScheme}>
      <span className="toggle-tip" role="status">
        <strong>{enabled ? i18n.t('toggle.enabledTitle') : i18n.t('toggle.pausedTitle')}</strong>
        <small>{enabled ? i18n.t('toggle.showOriginal') : i18n.t('toggle.enableFocused')}</small>
      </span>
      <button
        className={`toggle-button ${enabled ? 'toggle-enabled' : 'toggle-disabled'}`}
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label={label}
        title={label}
        disabled={!ready}
        onClick={onToggle}
      >
        <svg className="toggle-icon" viewBox="0 0 24 24" aria-hidden="true">
          <rect className="card-back" x="4.5" y="4.5" width="12" height="9" rx="2" />
          <rect className="card-front" x="7.5" y="10.5" width="12" height="9" rx="2" />
          <path d="M10.5 14h6M10.5 16.5h4" />
        </svg>
        <span className="state-dot" aria-hidden="true" />
      </button>
    </div>
  );
}
