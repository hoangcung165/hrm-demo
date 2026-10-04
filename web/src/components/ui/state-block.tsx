// Library component "State block" (pattern P10): empty, error or no-permission state of a page or card.
import { Lock, TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type StateBlockProps = {
  variant: 'empty' | 'error' | 'denied';
  /** Lucide icon of the page; only used by `empty`. */
  icon?: ReactNode;
  title: string;
  description?: string;
  /** At most one primary and one secondary Button. */
  actions?: ReactNode;
  className?: string;
};

export function StateBlock({ variant, icon, title, description, actions, className }: StateBlockProps) {
  return (
    <div
      role={variant === 'error' ? 'alert' : undefined}
      className={cn('flex flex-col items-center gap-2 px-6 py-8 text-center', className)}
    >
      <span
        aria-hidden="true"
        className={cn(
          'mb-2 grid size-12 place-items-center rounded-full border [&_svg]:size-5 [&_svg]:stroke-[1.5]',
          variant === 'empty' && 'border-transparent bg-brand-blue-soft text-brand-blue',
          variant === 'error' && 'border-line bg-surface-muted text-danger',
          variant === 'denied' && 'border-line bg-surface-muted text-ink-muted',
        )}
      >
        {variant === 'empty' ? icon : variant === 'error' ? <TriangleAlert /> : <Lock />}
      </span>
      <h2 className="text-heading">{title}</h2>
      {description ? <p className="max-w-[440px] text-ink-muted">{description}</p> : null}
      {actions ? <div className="mt-4 flex flex-wrap justify-center gap-2">{actions}</div> : null}
    </div>
  );
}
