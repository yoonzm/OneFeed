import type { ColorScheme } from '../../theme/useColorScheme';
import { i18n } from '../../i18n';

interface ThemeSwitchProps {
  colorScheme: ColorScheme;
  disabled?: boolean;
  onChange: (colorScheme: ColorScheme) => void;
}

export function ThemeSwitch({
  colorScheme,
  disabled = false,
  onChange,
}: ThemeSwitchProps) {
  const nextColorScheme = colorScheme === 'light' ? 'dark' : 'light';
  const label = nextColorScheme === 'dark'
    ? i18n.t('common.themeSwitchDark')
    : i18n.t('common.themeSwitchLight');

  return (
    <button
      className="relative grid size-8 shrink-0 cursor-pointer place-items-center rounded-md border-0 bg-transparent p-0 text-onefeed-ink transition-colors duration-150 hover:bg-onefeed-blue-soft focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-onefeed-focus disabled:cursor-wait disabled:opacity-60"
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={() => onChange(nextColorScheme)}
    >
      <svg
        className="size-[18px]"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0" />
        <path d="M12 3v18" />
        <path d="m12 9 4.65-4.65" />
        <path d="m12 14.3 7.37-7.37" />
        <path d="m12 19.6 8.85-8.85" />
      </svg>
    </button>
  );
}
