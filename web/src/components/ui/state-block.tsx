// Library component "State block" (pattern P10): empty, error or no-permission state of a page or card.
import { Lock, TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type StateBlockProps = {
  /** `plain` is the neutral block, e.g. a search without matches. */
  variant: 'empty' | 'error' | 'denied' | 'plain';
  /** Lucide icon; used by `empty` and `plain`. */
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
          (variant === 'denied' || variant === 'plain') && 'border-line bg-surface-muted text-ink-muted',
        )}
      >
        {variant === 'error' ? <TriangleAlert /> : variant === 'denied' ? <Lock /> : icon}
      </span>
      <h2 className="text-heading">{title}</h2>
      {description ? <p className="max-w-[440px] text-ink-muted">{description}</p> : null}
      {actions ? <div className="mt-4 flex flex-wrap justify-center gap-2">{actions}</div> : null}
    </div>
  );
}
