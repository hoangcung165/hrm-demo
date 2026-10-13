// The allocations of a project (`#15 Chi tiết dự án`): employee, Vai trò dự án, percent, range, and the peak Tải phân
// bổ across every project within the range. An allocation that has not started carries "Bắt đầu dd/mm". Whoever may
// edit the project also gets the row menu (Sửa phân bổ, Kết thúc sớm, Xóa phân bổ).
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { Person } from '@/components/ui/person';
import { formatDate, formatDayMonth, formatPercent } from '@/lib/format';
import type { Allocation } from '../api';
import { AllocationLoadCell } from './allocation-load-cell';
import { AllocationRowMenu } from './allocation-row-menu';

export type AllocationTableProps = {
  rows: Allocation[];
  /** Accessible name: "Phân bổ của dự án Ứng dụng đặt lịch khám". */
  caption: string;
  loading?: boolean;
  busy?: boolean;
  /** Below 768px: two-line rows (the phone shows the members, read-only). */
  compact?: boolean;
  /** A "Thao tác" column with the row menu (desktop, whoever may edit the project). */
  withActions?: boolean;
};

const W = { role: 'w-48 min-[1440px]:w-50', percent: 'w-24 text-right', range: 'w-56', load: 'w-52 min-[1440px]:w-55' };

export function AllocationTable({ rows, caption, loading = false, busy = false, compact = false, withActions = false }: AllocationTableProps) {
  const { t } = useTranslation();
  const columns = useMemo<Array<DataTableColumn<Allocation>>>(
    () => [
      {
        id: 'employee',
        header: t('projects.allocation.col.employee'),
        skeleton: 'person',
        cell: (row) => (
          <span className="flex flex-col items-start gap-1">
            <Person name={row.employee?.fullName ?? ''} caption={row.employee?.orgUnitName ?? undefined} />
            {row.status === 'UPCOMING' ? <Badge variant="info">{t('projects.allocation.startsOn', { date: formatDayMonth(row.startDate) })}</Badge> : null}
          </span>
        ),
      },
      { id: 'role', header: t('projects.allocation.col.role'), className: W.role, cell: (row) => row.projectRole?.name ?? '' },
      { id: 'percent', header: t('projects.allocation.col.percent'), className: W.percent, cell: (row) => <span className="font-medium tabular-nums">{formatPercent(row.percent)}</span> },
      { id: 'range', header: t('projects.allocation.col.range'), className: W.range, cell: (row) => <span className="tabular-nums">{`${formatDate(row.startDate)} – ${formatDate(row.endDate)}`}</span> },
      {
        id: 'load',
        header: t('projects.allocation.col.load'),
        className: W.load,
        cell: (row) => <AllocationLoadCell allocation={row} />,
      },
      ...(withActions ? [{ id: 'actions', header: t('projects.allocation.col.actions'), headerHidden: true, className: 'w-14', cell: (row: Allocation) => <AllocationRowMenu allocation={row} /> }] : []),
    ],
    [t, withActions],
  );
  return (
    <DataTable
      caption={caption}
      columns={columns}
      data={loading ? [] : rows}
      rowKey={(row) => row.id}
      // One page: a project has a handful of members.
      pageSize={200}
      loading={loading}
      loadingLabel={t('projects.allocation.loading')}
      loadingRows={4}
      busy={busy}
      variant={compact ? 'compact' : 'default'}
      rows={{
        lead: (row) => <Person name={row.employee?.fullName ?? ''} caption={[row.projectRole?.name, formatPercent(row.percent)].filter(Boolean).join(' · ')} />,
        meta: (row) => (
          <>
            <span className="text-caption text-ink-muted tabular-nums">{`${formatDate(row.startDate)} – ${formatDate(row.endDate)}`}</span>
            {row.status === 'UPCOMING' ? <Badge variant="info">{t('projects.allocation.startsOn', { date: formatDayMonth(row.startDate) })}</Badge> : null}
          </>
        ),
        metaLabel: t('projects.allocation.col.range'),
        end: (row) => <AllocationLoadCell allocation={row} />,
        endLabel: t('projects.allocation.col.load'),
      }}
    />
  );
}
