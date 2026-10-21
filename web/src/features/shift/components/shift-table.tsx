// The shifts: a table, or compact two-line rows below 768px. A company has a handful of shifts, so the list is not paged.
// With SHIFT_EDIT each row ends with its menu.
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { useMediaQuery } from '@/lib/use-media-query';
import type { Shift } from '../api';
import { formatMinutes } from '../format-duration';
import { useShiftActions } from '../shift-actions-context';
import { ShiftRowMenu } from './shift-row-menu';
import { ShiftStatusBadge } from './shift-status-badge';
import { ShiftTimeRange } from './shift-time-range';

// A company has a handful of shifts; the table pages from this many.
const PAGE_SIZE = 100;

export type ShiftTableProps = {
  /** Ignored while `loading`. */
  rows: Shift[];
  loading?: boolean;
};

export function ShiftTable({ rows, loading = false }: ShiftTableProps) {
  const { t } = useTranslation();
  const compact = useMediaQuery('(max-width: 767px)');
  // The actions column is absent without SHIFT_EDIT.
  const canEdit = useShiftActions() !== null;

  const columns = useMemo<Array<DataTableColumn<Shift>>>(() => {
    const none = <span className="text-ink-muted">{t('shifts.none')}</span>;
    return [
      { id: 'code', header: t('shifts.col.code'), className: 'w-28', cell: (shift) => <span className="tabular-nums">{shift.code}</span> },
      { id: 'name', header: t('shifts.col.name'), cell: (shift) => <span className="font-medium">{shift.name}</span> },
      { id: 'time', header: t('shifts.col.time'), className: 'w-60', cell: (shift) => <ShiftTimeRange shift={shift} /> },
      {
        id: 'break',
        header: t('shifts.col.break'),
        className: 'w-36',
        cell: (shift) => (shift.breakStart && shift.breakEnd ? <span className="tabular-nums whitespace-nowrap">{shift.breakStart} – {shift.breakEnd}</span> : none),
      },
      {
        id: 'tolerance',
        header: t('shifts.col.tolerance'),
        className: 'w-44',
        cell: (shift) => (
          <span className="flex flex-col text-caption text-ink-muted">
            <span>{t('shifts.late', { minutes: shift.lateToleranceMinutes })}</span>
            <span>{t('shifts.early', { minutes: shift.earlyToleranceMinutes })}</span>
          </span>
        ),
      },
      {
        id: 'rounding',
        header: t('shifts.col.rounding'),
        className: 'w-44',
        cell: (shift) => (shift.roundingMode === 'NONE' ? none : t(`shifts.rounding.summary.${shift.roundingMode}`, { minutes: shift.roundingMinutes })),
      },
      {
        id: 'scheduled',
        header: t('shifts.col.scheduled'),
        numeric: true,
        className: 'w-40',
        cell: (shift) => (
          <span className="flex flex-col items-end">
            <span>{formatMinutes(shift.scheduledMinutes, t)}</span>
            {shift.nightMinutes > 0 ? <span className="text-caption text-ink-muted">{t('shifts.nightHours', { duration: formatMinutes(shift.nightMinutes, t) })}</span> : null}
          </span>
        ),
      },
      { id: 'status', header: t('shifts.col.status'), className: 'w-36', cell: (shift) => <ShiftStatusBadge active={shift.active} /> },
      ...(canEdit ? [{ id: 'actions', header: t('shifts.col.actions'), headerHidden: true, className: 'w-14', cell: (shift: Shift) => <ShiftRowMenu shift={shift} /> }] : []),
    ];
  }, [t, canEdit]);

  return (
    <DataTable
      caption={t('shifts.caption')}
      columns={columns}
      data={loading ? [] : rows}
      rowKey={(shift) => shift.id}
      pageSize={PAGE_SIZE}
      loading={loading}
      loadingLabel={t('shifts.loading')}
      variant={compact ? 'compact' : 'default'}
      rows={{
        lead: (shift) => (
          <span className="flex flex-col">
            <span className="font-medium">{shift.name}</span>
            <span className="text-caption text-ink-muted tabular-nums">{shift.code}</span>
          </span>
        ),
        meta: (shift) => (
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <ShiftTimeRange shift={shift} />
            <span className="text-caption text-ink-muted">{formatMinutes(shift.scheduledMinutes, t)}</span>
          </span>
        ),
        metaLabel: t('shifts.col.time'),
        end: (shift) => <ShiftStatusBadge active={shift.active} />,
        endLabel: t('shifts.col.status'),
        action: canEdit ? (shift) => <ShiftRowMenu shift={shift} touch /> : undefined,
      }}
    />
  );
}
