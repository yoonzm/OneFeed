import * as SwitchPrimitive from '@radix-ui/react-switch';

interface SwitchProps {
  checked: boolean;
  label: string;
  className?: string;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
}

/** Radix 提供语义和键盘交互，样式 API 与 shadcn/ui 的 Switch 保持一致。 */
export function Switch({
  checked,
  label,
  className = '',
  disabled,
  onCheckedChange,
}: SwitchProps) {
  return (
    <SwitchPrimitive.Root
      className={`ui-switch ${className}`.trim()}
      checked={checked}
      aria-label={label}
      disabled={disabled}
      onCheckedChange={onCheckedChange}
    >
      <SwitchPrimitive.Thumb className="ui-switch-thumb" />
    </SwitchPrimitive.Root>
  );
}
