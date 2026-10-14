// The body of the cell detail drawer: the overload alert, the load period by period, and the allocations behind it;
// or, for a week with no allocation, when the next one starts.
import { CalendarClock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Alert } from '@/components/ui/alert';
import { AllocationLoadRow } from '@/components/ui/allocation-load-row';
import { EmptyState } from '@/components/ui/empty-state';
import { formatDate, formatDateRange, formatPercent } from '@/lib/format';
import type { CellDetail } from '../api';
import { CellAllocationItem } from './cell-allocation-item';

export type CellDetailBodyProps = { detail: CellDetail; canOpenProject: boolean };

export function CellDetailBody({ detail, canOpenProject }: CellDetailBodyProps) {
  const { t } = useTranslation();
  const name = detail.employee.fullName;
  if (detail.allocations.length === 0) {
    const next = detail.nextAllocation;
    return (
      <EmptyState
        icon={<CalendarClock aria-hidden="true" />}
        title={t('resources.cell.emptyTitle')}
        description={
          next
            ? t('resources.cell.emptyNext', { project: `${next.projectCode} · ${next.projectName}`, date: formatDate(next.startDate), percent: formatPercent(next.percent) })
            : t('resources.cell.emptyNone')
        }
      />
    );
  }
  return (
    <div className="flex flex-col gap-5">
      {detail.overloaded ? (
        <Alert variant="danger" title={t('resources.cell.overTitle', { name, percent: formatPercent(detail.peak) })}>
          {t('resources.cell.overHint')}
        </Alert>
      ) : null}
      <section aria-labelledby="cell-periods" className="flex flex-col gap-1">
        <h3 id="cell-periods" className="text-body-strong">
          {t('resources.cell.periods')}
        </h3>
        <ul className="divide-y divide-line">
          {detail.periods.map((period) => (
            <AllocationLoadRow
              key={`${period.from}-${period.to}`}
              period={formatDateRange(period.from, period.to)}
              percent={period.totalPercent}
              label={t(period.overloaded ? 'projects.load.labelOver' : 'projects.load.label', { percent: formatPercent(period.totalPercent) })}
              breakdown={period.parts.map((part) => `${part.projectCode ?? part.projectName ?? ''} ${formatPercent(part.percent)}`).join(' + ') || t('projects.allocate.noLoad')}
              overloadLead={period.overloaded ? t('projects.allocate.overLead') : undefined}
            />
          ))}
        </ul>
      </section>
      <section aria-labelledby="cell-allocations" className="flex flex-col gap-2">
        <h3 id="cell-allocations" className="text-body-strong">
          {t('resources.cell.allocations', { count: detail.allocations.length })}
        </h3>
        <ul className="flex flex-col gap-2">
          {detail.allocations.map((allocation) => (
            <CellAllocationItem key={allocation.id} allocation={allocation} from={detail.from} to={detail.to} linkToProject={canOpenProject} />
          ))}
        </ul>
      </section>
    </div>
  );
}
