import * as SwitchPrimitive from '@radix-ui/react-switch';

interface SettingSwitchProps {
  checked: boolean;
  label: string;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
}

/** Radix 负责开关语义与键盘交互，视觉状态统一由 OneFeed 主题令牌控制。 */
export function SettingSwitch({
  checked,
  label,
  disabled,
  onCheckedChange,
}: SettingSwitchProps) {
  return (
    <SwitchPrimitive.Root
      className="filter-switch"
      checked={checked}
      aria-label={label}
      disabled={disabled}
      onCheckedChange={onCheckedChange}
    >
      <SwitchPrimitive.Thumb className="filter-switch-thumb" />
    </SwitchPrimitive.Root>
  );
}
