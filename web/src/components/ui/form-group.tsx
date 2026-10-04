// Field group of the library component "Card": a `line` divider, then a legend and the group's own fields.
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type FormGroupProps = {
  /** Names the group, e.g. "Người đại diện theo pháp luật". */
  legend: string;
  children: ReactNode;
  className?: string;
};

export function FormGroup({ legend, children, className }: FormGroupProps) {
  return (
    // The divider sits on a wrapper: a border on the fieldset itself would be cut by the legend.
    <div className={cn('border-t border-line pt-4', className)}>
      <fieldset className="min-w-0">
        <legend className="mb-4 text-body-strong">{legend}</legend>
        {children}
      </fieldset>
    </div>
  );
}
