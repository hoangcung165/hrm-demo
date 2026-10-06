// Legend of a matrix (`hrm-legend`): what its marks mean, under the table.
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export type MatrixLegendProps =
  /** Read-only matrix: meaning of the check and of the dash ("Có", "Không"). */
  | { yesLabel: string; noLabel: string; className?: string }
  /** Editable matrix: the empty box, the bare check and, while something is changed, the tinted swatch. */
  | { pickLabel: string; lockedLabel: string; changedLabel?: string; className?: string };

const ITEM = 'inline-flex items-center gap-2';

export function MatrixLegend(props: MatrixLegendProps) {
  return (
    <ul className={cn('flex flex-wrap gap-x-6 gap-y-2 text-body-small text-ink-muted', props.className)}>
      {'pickLabel' in props ? (
        <>
          <li className={ITEM}>
            <span aria-hidden="true" className="size-4.5 rounded-[4px] border-[1.5px] border-ink-muted bg-surface" />
            {props.pickLabel}
          </li>
          <li className={ITEM}>
            <Check aria-hidden="true" className="size-5 stroke-2" />
            {props.lockedLabel}
          </li>
          {props.changedLabel ? (
            <li className={ITEM}>
              <span aria-hidden="true" className="relative size-6 rounded-sm bg-warning-soft">
                <span className="absolute top-0.75 right-0.75 size-1.5 rounded-full bg-warning" />
              </span>
              {props.changedLabel}
            </li>
          ) : null}
        </>
      ) : (
        <>
          <li className={ITEM}>
            <Check aria-hidden="true" className="size-5 stroke-2 text-success" />
            {props.yesLabel}
          </li>
          <li className={ITEM}>
            <span aria-hidden="true">–</span>
            {props.noLabel}
          </li>
        </>
      )}
    </ul>
  );
}
