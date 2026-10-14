// Library component "Heatmap cell" (`hrm-heat`): one Tải phân bổ as a tinted cell with its percent, never colour
// alone. Four levels follow the company's Ngưỡng nguồn lực (HRM-17): under the bench threshold `bench` (default 50%),
// up to the near-full level `partial` (default 90%), up to 100% `full`, above 100% `over` with the warning icon.
// `sm` is the small cell of the heatmap, the legend and dense lists.
import { cva } from 'class-variance-authority';
import { TriangleAlert } from 'lucide-react';
import { formatPercent } from '@/lib/format';
import { cn } from '@/lib/utils';

export type HeatLevel = 'bench' | 'partial' | 'full' | 'over';

/** The company's thresholds: a load under `bench` is Bench, from `nearFull` to 100% is full. */
export type HeatThresholds = { bench: number; nearFull: number };

/** The thresholds a company has until it changes them (`ResourceThresholds.DEFAULTS` in the backend). */
export const DEFAULT_HEAT_THRESHOLDS: HeatThresholds = { bench: 50, nearFull: 90 };

/** The level of a load, as the cell colours it. Above 100% is always `over`. */
export const heatLevel = (percent: number, thresholds: HeatThresholds = DEFAULT_HEAT_THRESHOLDS): HeatLevel =>
  percent > 100 ? 'over' : percent >= thresholds.nearFull ? 'full' : percent < thresholds.bench ? 'bench' : 'partial';

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
  /** The company's thresholds; the defaults until the page knows them. */
  thresholds?: HeatThresholds;
  className?: string;
};

export function HeatCell({ percent, label, size = 'md', thresholds, className }: HeatCellProps) {
  const level = heatLevel(percent, thresholds);
  return (
    <span role="img" aria-label={label} className={cn(cell({ level, size }), className)}>
      {level === 'over' ? <TriangleAlert aria-hidden="true" className="stroke-2" /> : null}
      <span aria-hidden="true">{formatPercent(percent)}</span>
    </span>
  );
}
