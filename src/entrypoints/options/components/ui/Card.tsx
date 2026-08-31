import type { ElementType, HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: 'article' | 'div' | 'section';
  children: ReactNode;
}

interface CardPartProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

/** 卡片只约束表面、边框与组合结构，具体布局仍由业务类名负责。 */
export function Card({ as = 'div', children, className = '', ...props }: CardProps) {
  const Component = as as ElementType;
  return (
    <Component className={`ui-card ${className}`.trim()} data-slot="card" {...props}>
      {children}
    </Component>
  );
}

export function CardHeader({ children, className = '', ...props }: CardPartProps) {
  return (
    <div className={`ui-card-header ${className}`.trim()} data-slot="card-header" {...props}>
      {children}
    </div>
  );
}

export function CardContent({ children, className = '', ...props }: CardPartProps) {
  return (
    <div className={`ui-card-content ${className}`.trim()} data-slot="card-content" {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className = '', ...props }: CardPartProps) {
  return (
    <div className={`ui-card-footer ${className}`.trim()} data-slot="card-footer" {...props}>
      {children}
    </div>
  );
}
