// Library component "Allocation load row": one period of Tải phân bổ in the "try allocation" result of the allocate
// dialog. Grid `148px · 72px · 1fr`: the dates, the heat cell, and which projects add up. An overloaded period starts
// its breakdown with the lead word ("Quá tải:") in `danger`. HRM-17 (heatmap cell detail) reuses it.
import { HeatCell } from '@/components/ui/heat-cell';
import { cn } from '@/lib/utils';

export type AllocationLoadRowProps = {
  /** The dates, already formatted: "14/10 – 31/10/2026". */
  period: string;
  /** Tải phân bổ of the period in percent. */
  percent: number;
  /** Read out for the heat cell: "Tải phân bổ 120%, quá tải". */
  label: string;
  /** Which projects add up: "DA-029 60% + DA-031 60%". */
  breakdown: string;
  /** Set on an overloaded period: the lead word is shown before the breakdown. */
  overloadLead?: string;
  className?: string;
};

export function AllocationLoadRow({ period, percent, label, breakdown, overloadLead, className }: AllocationLoadRowProps) {
  return (
    <li className={cn('grid grid-cols-[148px_72px_1fr] items-center gap-3 py-2', className)}>
      <span className="text-caption tabular-nums">{period}</span>
      <HeatCell percent={percent} label={label} size="sm" />
      <span className="text-caption text-ink-muted">
        {overloadLead ? <span className="font-semibold text-danger">{overloadLead} </span> : null}
        {breakdown}
      </span>
    </li>
  );
}
