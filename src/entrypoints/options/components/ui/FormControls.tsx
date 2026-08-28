import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from 'react';

export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`ui-input ${className}`.trim()} {...props} />;
}

interface NativeSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  children: ReactNode;
}

export function NativeSelect({ children, className = '', ...props }: NativeSelectProps) {
  return (
    <select className={`ui-select ${className}`.trim()} {...props}>
      {children}
    </select>
  );
}
