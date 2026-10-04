// Field shell shared by the library's form controls: label above, helper or error below (caption, danger).
// FormField and FormSelect wrap it for react-hook-form; use it directly around a control outside a form's values.
import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type FieldControlProps = {
  id: string;
  'aria-describedby': string | undefined;
  'aria-required': true | undefined;
  invalid: boolean;
};

export type FieldProps = {
  /** Always visible. */
  label: string;
  required?: boolean;
  helper?: ReactNode;
  /** Already translated; replaces the helper. */
  error?: string;
  /** Renders the control with the ids that tie it to the label and the note. */
  children: (control: FieldControlProps) => ReactNode;
  className?: string;
};

export function Field({ label, required, helper, error, children, className }: FieldProps) {
  const id = useId();
  const noteId = error ? `${id}-error` : helper ? `${id}-helper` : undefined;
  return (
    <div className={cn('flex min-w-0 flex-col gap-1', className)}>
      <label htmlFor={id} className="text-[14px] leading-5 font-medium text-ink">
        {label}
        {required ? (
          <span aria-hidden="true" className="text-danger">
            {' '}
            *
          </span>
        ) : null}
      </label>
      {children({ id, 'aria-describedby': noteId, 'aria-required': required || undefined, invalid: Boolean(error) })}
      {error ? (
        <span id={noteId} role="alert" className="text-caption text-danger">
          {error}
        </span>
      ) : helper ? (
        <span id={noteId} className="text-caption text-ink-muted">
          {helper}
        </span>
      ) : null}
    </div>
  );
}
