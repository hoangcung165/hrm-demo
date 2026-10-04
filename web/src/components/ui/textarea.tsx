// Library component "Textarea": the bordered multi-line control. Label, helper, error and count come from FormField.
import type { TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  invalid?: boolean;
  wrapperClassName?: string;
};

export function Textarea({ invalid, wrapperClassName, className, disabled, rows = 3, ...props }: TextareaProps) {
  return (
    <span
      className={cn(
        'flex min-h-22 items-stretch rounded-sm border border-line bg-surface px-3 py-2 text-ink',
        'focus-within:border-brand-blue focus-within:shadow-focus-ring',
        invalid && 'border-danger',
        disabled && 'bg-surface-muted text-ink-muted',
        wrapperClassName,
      )}
    >
      <textarea
        rows={rows}
        className={cn(
          'min-w-0 flex-1 resize-y border-0 bg-transparent text-body text-inherit outline-none placeholder:text-ink-muted focus-visible:shadow-none',
          className,
        )}
        aria-invalid={invalid || undefined}
        disabled={disabled}
        {...props}
      />
    </span>
  );
}
