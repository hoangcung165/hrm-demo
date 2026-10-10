// Library component "Alert": inline banner that explains a state the user should know about.
import { CircleCheck, Info, TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type AlertProps = {
  variant: 'info' | 'success' | 'warning' | 'danger';
  /** What happened, to what; may carry emphasis (a name in bold). */
  title: ReactNode;
  /** Cause and fix. */
  children?: ReactNode;
  className?: string;
};

const ICONS = { info: Info, success: CircleCheck, warning: TriangleAlert, danger: TriangleAlert } as const;

export function Alert({ variant, title, children, className }: AlertProps) {
  const Icon = ICONS[variant];
  return (
    <div
      role={variant === 'danger' || variant === 'warning' ? 'alert' : 'status'}
      className={cn(
        'flex gap-3 rounded-md border px-4 py-3',
        variant === 'info' && 'border-transparent bg-info',
        variant === 'success' && 'border-transparent bg-brand-teal-soft',
        variant === 'warning' && 'border-transparent bg-warning-soft',
        variant === 'danger' && 'border-line bg-surface',
        className,
      )}
    >
      <Icon
        aria-hidden="true"
        className={cn(
          'mt-px size-5 shrink-0 stroke-[1.5]',
          variant === 'info' && 'text-brand-blue',
          variant === 'success' && 'text-success',
          variant === 'warning' && 'text-warning',
          variant === 'danger' && 'text-danger',
        )}
      />
      <div>
        <div className={cn('font-medium', variant === 'danger' && 'text-danger')}>{title}</div>
        {children ? <div className="text-caption text-ink-muted">{children}</div> : null}
      </div>
    </div>
  );
}
