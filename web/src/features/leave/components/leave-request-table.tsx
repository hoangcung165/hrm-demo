// "Đơn của tôi": the caller's requests of a year, latest first, paged by the server. The type is the link that opens
// the request; the whole row opens it too. Below 768px the same records as compact rows.
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { formatDayMonth } from '@/lib/format';
import { LEAVE_PAGE_SIZE, type LeaveRequestListItem } from '../api';
import { formatDays, formatSpan } from '../leave-format';
import { LeaveStatusBadge } from './leave-status-badge';

export type LeaveRequestTableProps = {
  caption: string;
  rows: LeaveRequestListItem[];
  total: number;
  pageIndex: number;
  onPageChange: (page: number) => void;
  loading: boolean;
  busy: boolean;
  compact: boolean;
};

const href = (row: LeaveRequestListItem) => `/leave/requests/${row.id}`;
const LINK = 'truncate rounded-sm font-medium text-ink no-underline hover:text-brand-blue hover:underline';

export function LeaveRequestTable({ caption, rows, total, pageIndex, onPageChange, loading, busy, compact }: LeaveRequestTableProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const span = (row: LeaveRequestListItem) => formatSpan(t, row.startDate, row.startPart, row.endDate, row.endPart);
  const columns = useMemo<Array<DataTableColumn<LeaveRequestListItem>>>(
    () => [
      { id: 'type', header: t('leave.list.col.type'), cell: (row) => <Link to={href(row)} className={LINK}>{row.leaveType.name}</Link> },
      { id: 'days', header: t('leave.list.col.dates'), cell: (row) => <span className="tabular-nums">{span(row)}</span> },
      { id: 'count', header: t('leave.list.col.count'), numeric: true, className: 'w-24', cell: (row) => formatDays(row.days) },
      { id: 'status', header: t('leave.list.col.status'), className: 'w-36', cell: (row) => <LeaveStatusBadge status={row.status} /> },
      { id: 'sent', header: t('leave.list.col.sent'), className: 'w-32', cell: (row) => <span className="tabular-nums text-ink-muted">{formatDayMonth(row.createdAt)}</span> },
    ],
    // `span` only reads `t`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t],
  );
  return (
    <DataTable
      caption={caption}
      columns={columns}
      data={rows}
      rowKey={(row) => row.id}
      pageSize={LEAVE_PAGE_SIZE}
      pageIndex={pageIndex}
      total={total}
      onPageChange={onPageChange}
      summary={({ from, to, total: count }) => t('leave.list.summary', { from, to, total: count })}
      loading={loading}
      loadingLabel={t('leave.list.loading')}
      loadingRows={3}
      busy={busy}
      variant={compact ? 'compact' : 'default'}
      rows={{
        lead: (row) => (
          <span className="flex min-w-0 flex-col">
            <Link to={href(row)} className={LINK}>
              {t('leave.list.rowTitle', { type: row.leaveType.name, days: formatDays(row.days) })}
            </Link>
            <span className="text-caption text-ink-muted tabular-nums">{span(row)}</span>
          </span>
        ),
        meta: (row) => <span className="text-caption text-ink-muted">{t('leave.list.sentOn', { date: formatDayMonth(row.createdAt) })}</span>,
        end: (row) => <LeaveStatusBadge status={row.status} />,
        endLabel: t('leave.list.col.status'),
      }}
      onRowClick={(row) => navigate(href(row))}
    />
  );
}
