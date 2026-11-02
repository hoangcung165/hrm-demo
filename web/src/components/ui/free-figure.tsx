// Library component "Free figure" (`hrm-free`, HRM-16): % còn trống as a large number with a note under it, right
// aligned. The note is the plain label "còn trống", or a Badge when something needs saying: "Thiếu 30%", "Quá tải 110%".
import type { ReactNode } from 'react';
import { formatPercent } from '@/lib/format';
import { cn } from '@/lib/utils';

export type FreeFigureProps = {
  percent: number;
  /** Under the number: a text, or a Badge. */
  note: ReactNode;
  /** Read out for the number: "70% còn trống". */
  label: string;
  className?: string;
};

export function FreeFigure({ percent, note, label, className }: FreeFigureProps) {
  return (
    <span className={cn('flex flex-col items-end gap-0.5 text-right', className)}>
      <span className="sr-only">{label}</span>
      <span aria-hidden="true" className="text-[24px] leading-8 font-semibold tabular-nums text-ink">
        {formatPercent(percent)}
      </span>
      {/* A plain note repeats the label; a Badge carries news ("Thiếu 30%") and is read. */}
      <span aria-hidden={typeof note === 'string' || undefined} className="text-caption font-medium text-ink-muted">
        {note}
      </span>
    </span>
  );
}
