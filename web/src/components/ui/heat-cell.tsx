// Library component "Heatmap cell" (`hrm-heat`): one Tải phân bổ as a tinted cell with its percent, never colour
// alone. Under 100% `partial`, exactly 100% `full`, above 100% `over` with the warning icon; 0% `bench`.
// `sm` is the small cell of the legend and of dense lists.
import { cva } from 'class-variance-authority';
import { TriangleAlert } from 'lucide-react';
import { formatPercent } from '@/lib/format';
import { cn } from '@/lib/utils';

export type HeatLevel = 'bench' | 'partial' | 'full' | 'over';

/** The level of a load, as the cell colours it. */
export const heatLevel = (percent: number): HeatLevel => (percent <= 0 ? 'bench' : percent < 100 ? 'partial' : percent === 100 ? 'full' : 'over');

const cell = cva('inline-flex shrink-0 items-center justify-center gap-0.5 rounded-sm font-medium tabular-nums', {
  variants: {
    level: {
      bench: 'border border-line bg-heat-bench text-ink-muted',
      partial: 'bg-heat-partial text-ink',
      full: 'bg-heat-full text-on-brand',
      over: 'bg-heat-over text-on-brand',
    },
    size: { md: 'h-10 w-18 text-[13px] [&_svg]:size-3.5', sm: 'h-7 w-16 text-caption [&_svg]:size-3' },
  },
  defaultVariants: { size: 'md' },
});

export type HeatCellProps = {
  /** Tải phân bổ in percent, e.g. 120. */
  percent: number;
  /** Read out instead of the bare percent: "Tải phân bổ 120%, quá tải". */
  label: string;
  size?: 'md' | 'sm';
  className?: string;
};

export function HeatCell({ percent, label, size = 'md', className }: HeatCellProps) {
  const level = heatLevel(percent);
  return (
    <span role="img" aria-label={label} className={cn(cell({ level, size }), className)}>
      {level === 'over' ? <TriangleAlert aria-hidden="true" className="stroke-2" /> : null}
      <span aria-hidden="true">{formatPercent(percent)}</span>
    </span>
  );
}
