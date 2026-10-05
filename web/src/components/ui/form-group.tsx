// Field group of the library component "Card": a `line` divider, then a legend and the group's own fields.
// A group that is one choice (a set of Checkboxes) can be required and carries its own helper or error line.
import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type FormGroupProps = {
  /** Names the group, e.g. "Người đại diện theo pháp luật". */
  legend: string;
  /** Marks the legend with the asterisk of a required field. */
  required?: boolean;
  /** One line under the fields, about the group as a whole. */
  helper?: ReactNode;
  /** Already translated; replaces the helper, and is announced when it appears. */
  error?: string;
  children: ReactNode;
  className?: string;
};

export function FormGroup({ legend, required, helper, error, children, className }: FormGroupProps) {
  const id = useId();
  const noteId = error || helper ? `${id}-note` : undefined;
  return (
    // The divider sits on a wrapper: a border on the fieldset itself would be cut by the legend.
    <div className={cn('border-t border-line pt-4', className)}>
      <fieldset className="min-w-0" aria-describedby={noteId} aria-invalid={error ? true : undefined}>
        <legend className="mb-4 text-body-strong">
          {legend}
          {required ? (
            <span aria-hidden="true" className="text-danger">
              {' '}
              *
            </span>
          ) : null}
        </legend>
        {children}
        {error ? (
          <span id={noteId} role="alert" className="mt-4 block text-caption text-danger">
            {error}
          </span>
        ) : helper ? (
          <span id={noteId} className="mt-4 block text-caption text-ink-muted">
            {helper}
          </span>
        ) : null}
      </fieldset>
    </div>
  );
}
