import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive';
type ButtonSize = 'default' | 'sm' | 'icon';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
}

/**
 * 设置页按钮的唯一视觉入口；variant 与 size 对齐 shadcn/ui 的组合方式。
 */
export function Button({
  children,
  className = '',
  variant = 'default',
  size = 'default',
  ...props
}: ButtonProps) {
  return (
    <button
      className={`ui-button ui-button-${variant} ui-button-${size} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}
