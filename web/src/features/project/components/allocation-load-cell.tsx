// "Tải phân bổ cao nhất" of an allocation: the heat cell of the Employee's peak load across every project within the
// allocation's range, and the overloaded period(s) under it in `danger`.
import { useTranslation } from 'react-i18next';
import { HeatCell } from '@/components/ui/heat-cell';
import { formatDateRange, formatPercent } from '@/lib/format';
import type { Allocation } from '../api';

export type AllocationLoadCellProps = { allocation: Allocation };

export function AllocationLoadCell({ allocation }: AllocationLoadCellProps) {
  const { t } = useTranslation();
  const peak = allocation.peakLoad;
  const label = t(peak > 100 ? 'projects.load.labelOver' : 'projects.load.label', { percent: formatPercent(peak) });
  return (
    <span className="flex flex-col items-start gap-0.5">
      <HeatCell percent={peak} label={label} />
      {allocation.overloadedPeriods.map((period) => (
        <span key={period.from} className="text-caption font-medium text-danger tabular-nums">
          {formatDateRange(period.from, period.to)}
        </span>
      ))}
    </span>
  );
}
