import { i18n } from '../i18n';

interface FloatingToggleProps {
  enabled: boolean;
  ready: boolean;
  iconUrl: string;
  onToggle: () => void;
}

export function FloatingToggle({
  enabled,
  ready,
  iconUrl,
  onToggle,
}: FloatingToggleProps) {
  const label = enabled
    ? i18n.t('toggle.disableLabel')
    : i18n.t('toggle.enableLabel');

  return (
    <div className="floating-toggle">
      <span className="toggle-tip" role="status">
        <strong>{enabled ? i18n.t('toggle.enabledTitle') : i18n.t('toggle.pausedTitle')}</strong>
        <small>{enabled ? i18n.t('toggle.showOriginal') : i18n.t('toggle.enableFocused')}</small>
      </span>
      <button
        className={`toggle-button${enabled ? '' : ' toggle-disabled'}`}
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label={label}
        title={label}
        disabled={!ready}
        onClick={onToggle}
      >
        <img className="toggle-logo" src={iconUrl} alt="" aria-hidden="true" />
        <span className="state-dot" aria-hidden="true" />
      </button>
    </div>
  );
}
