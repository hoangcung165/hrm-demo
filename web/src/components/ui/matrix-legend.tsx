// Legend of a matrix (`hrm-legend`): what its marks mean, under the table.
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export type MatrixLegendProps = {
  /** Meaning of the check and of the dash: "Có", "Không". */
  yesLabel: string;
  noLabel: string;
  className?: string;
};

export function MatrixLegend({ yesLabel, noLabel, className }: MatrixLegendProps) {
  return (
    // 14/20 is the design system's size for a legend; there is no text token for it.
    <ul className={cn('flex flex-wrap gap-x-6 gap-y-2 text-[14px] leading-5 text-ink-muted', className)}>
      <li className="inline-flex items-center gap-2">
        <Check aria-hidden="true" className="size-5 stroke-2 text-success" />
        {yesLabel}
      </li>
      <li className="inline-flex items-center gap-2">
        <span aria-hidden="true">–</span>
        {noLabel}
      </li>
    </ul>
  );
}
