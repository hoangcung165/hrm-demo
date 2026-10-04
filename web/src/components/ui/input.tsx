// Library component "Input": the bordered control. Label, helper and error text come from FormField.
import type { InputHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
  /** Lucide 16px icon before the value, e.g. search. */
  leading?: ReactNode;
  /** Trailing control, e.g. the show/hide password button. */
  trailing?: ReactNode;
  wrapperClassName?: string;
};

export function Input({ invalid, leading, trailing, wrapperClassName, className, disabled, ...props }: InputProps) {
  return (
    <span
      className={cn(
        'flex h-10 items-center gap-2 rounded-sm border border-line bg-surface px-3 text-ink',
        'focus-within:border-brand-blue focus-within:shadow-focus-ring',
        '[&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:stroke-[1.5] [&>svg]:text-ink-muted',
        invalid && 'border-danger',
        disabled && 'bg-surface-muted text-ink-muted',
        wrapperClassName,
      )}
    >
      {leading}
      <input
        className={cn(
          'min-w-0 flex-1 border-0 bg-transparent text-body text-inherit outline-none placeholder:text-ink-muted focus-visible:shadow-none',
          className,
        )}
        aria-invalid={invalid || undefined}
        disabled={disabled}
        {...props}
      />
      {trailing}
    </span>
  );
}
