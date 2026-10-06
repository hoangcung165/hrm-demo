// Library component "Radio" (`hrm-radio`): an 18px circle with its label, one choice of a group. The native input
// stays in the DOM for the keyboard (arrow keys move within the group) and forms.
import type { InputHTMLAttributes, ReactNode, Ref } from 'react';
import { cn } from '@/lib/utils';

export type RadioProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'children'> & { children: ReactNode; ref?: Ref<HTMLInputElement> };

export function Radio({ children, className, ...props }: RadioProps) {
  return (
    // `relative`: the hidden input stays inside its label, so focus scrolls the circle into view inside a scrolling dialog.
    <label className={cn('relative inline-flex cursor-pointer items-center gap-2 has-disabled:cursor-not-allowed has-disabled:text-ink-muted', className)}>
      <input type="radio" className="peer sr-only" {...props} />
      <span
        aria-hidden="true"
        className="grid size-4.5 shrink-0 place-items-center rounded-full border-[1.5px] border-ink-muted bg-surface peer-checked:border-brand-blue peer-checked:[&>span]:block peer-focus-visible:shadow-focus-ring peer-disabled:opacity-45"
      >
        <span className="hidden size-2 rounded-full bg-brand-blue" />
      </span>
      {children}
    </label>
  );
}
