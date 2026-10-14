// The drawer a heatmap cell opens: who, which week or month (with steps to the neighbouring ones), the load and the
// projects behind it. Non-modal: the heatmap stays usable. Read-only: allocations are changed on the project.
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Drawer } from '@/components/ui/drawer';
import { ErrorState } from '@/components/ui/error-state';
import { HeatCell } from '@/components/ui/heat-cell';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrentAccount } from '@/features/auth/account-context';
import { formatPercent } from '@/lib/format';
import { useCellDetail, type Heatmap } from '../api';
import type { CellSelection } from '../cell-selection';
import { periodNames } from '../period-label';
import { CellDetailBody } from './cell-detail-body';

export type CellDetailDrawerProps = {
  /** The cell that is open; `null` closes the drawer. */
  selection: CellSelection | null;
  /** The heatmap behind it: gives the granularity, the thresholds and the neighbouring periods. */
  data: Heatmap | undefined;
  onSelect: (selection: CellSelection) => void;
  onClose: () => void;
  /** Gets focus when the cell that opened the drawer is gone. */
  fallbackFocus?: () => HTMLElement | null;
};

export function CellDetailDrawer({ selection, data, onSelect, onClose, fallbackFocus }: CellDetailDrawerProps) {
  const { t } = useTranslation();
  const { permissions } = useCurrentAccount();
  const detail = useCellDetail(selection?.employeeId ?? '', selection?.from ?? '', selection?.to ?? '', selection !== null);
  const granularity = data?.granularity ?? 'WEEK';
  const columns = data?.columns ?? [];
  const index = selection ? columns.findIndex((column) => column.from === selection.from) : -1;
  const step = (by: number) => {
    const column = columns[index + by];
    if (selection && column) onSelect({ employeeId: selection.employeeId, from: column.from, to: column.to });
  };
  const period = selection ? periodNames({ from: selection.from, to: selection.to }, granularity, t).name : '';
  const info = detail.data;
  const sub = info ? [info.employee.code, info.position, info.employee.orgUnitName].filter(Boolean).join(' · ') : undefined;
  const canOpenProfile = permissions.includes('EMPLOYEE_VIEW');

  return (
    <Drawer
      open={selection !== null}
      onClose={onClose}
      caption={t('resources.cell.caption')}
      title={info?.employee.fullName ?? <Skeleton className="h-6 w-40" />}
      subtitle={sub}
      fallbackFocus={fallbackFocus}
      footer={
        canOpenProfile && selection ? (
          <Link to={`/employees/${selection.employeeId}`} className="inline-flex h-10 items-center rounded-md border border-line px-4 text-body font-medium hover:bg-surface-muted focus-visible:shadow-focus-ring">
            {t('resources.cell.viewProfile')}
          </Link>
        ) : undefined
      }
    >
      <div className="mb-4 flex items-center justify-between gap-2 rounded-md bg-surface-muted px-2 py-1">
        <Button variant="secondary" size="icon-sm" aria-label={t('resources.cell.previous')} disabled={index <= 0} onClick={() => step(-1)}>
          <ChevronLeft aria-hidden="true" />
        </Button>
        <span className="text-body-strong" aria-live="polite">
          {period}
        </span>
        <Button variant="secondary" size="icon-sm" aria-label={t('resources.cell.next')} disabled={index < 0 || index >= columns.length - 1} onClick={() => step(1)}>
          <ChevronRight aria-hidden="true" />
        </Button>
      </div>
      {detail.isError ? (
        <ErrorState title={t('resources.cell.loadError')} onRetry={() => void detail.refetch()} />
      ) : !info ? (
        <div role="status" aria-label={t('resources.cell.loading')} className="flex flex-col gap-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <HeatCell
              percent={info.peak}
              size="md"
              thresholds={data ? { bench: data.thresholds.benchPercent, nearFull: data.thresholds.nearFullPercent } : undefined}
              label={t(info.peak > 100 ? 'projects.load.labelOver' : 'projects.load.label', { percent: formatPercent(info.peak) })}
            />
            <span className="text-body text-ink-muted">{t('resources.cell.peak')}</span>
          </div>
          <CellDetailBody detail={info} canOpenProject={permissions.includes('PROJECT_VIEW')} />
        </div>
      )}
    </Drawer>
  );
}
