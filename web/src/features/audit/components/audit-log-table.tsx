// The Audit log list: a table (time, person, action, object, summary), or compact two-line rows below 768px, paged by
// the server. A click anywhere on a row opens its record; the summary is the button keyboard users reach. There is no
// edit or delete control: the log is read only.
import { ChevronRight } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { Person } from '@/components/ui/person';
import { formatDateTime, formatDayMonthTime } from '@/lib/format';
import { AUDIT_PAGE_SIZE, type AuditLogListItem } from '../api';
import { useAuditLabels } from '../use-audit-labels';
import { AuditActionBadge } from './audit-action-badge';
import { AuditSummaryButton } from './audit-summary-button';

export type AuditLogTableProps = {
  rows: AuditLogListItem[];
  total: number;
  /** Zero-based. */
  pageIndex: number;
  onPageChange: (pageIndex: number) => void;
  summary: (range: { from: number; to: number; total: number }) => string;
  onOpen: (row: AuditLogListItem) => void;
  loading?: boolean;
  busy?: boolean;
  compact?: boolean;
};

const W = { time: 'w-44', person: 'w-56 min-[1440px]:w-64', action: 'w-24', object: 'w-48 min-[1440px]:w-56' };

export function AuditLogTable({ rows, total, pageIndex, onPageChange, summary, onOpen, loading = false, busy = false, compact = false }: AuditLogTableProps) {
  const { t } = useTranslation();
  const labels = useAuditLabels();

  const columns = useMemo<Array<DataTableColumn<AuditLogListItem>>>(
    () => [
      { id: 'time', header: t('audit.col.time'), className: W.time, cell: (row) => <time dateTime={row.occurredAt} className="whitespace-nowrap tabular-nums">{formatDateTime(row.occurredAt)}</time> },
      { id: 'person', header: t('audit.col.person'), className: W.person, skeleton: 'person', cell: (row) => <Person name={labels.actor(row.actorName, row.actorId)} /> },
      { id: 'action', header: t('audit.col.action'), className: W.action, cell: (row) => <AuditActionBadge action={row.action} /> },
      { id: 'object', header: t('audit.col.object'), className: W.object, cell: (row) => labels.entityType(row.entityType, row.entityLabel) },
      { id: 'summary', header: t('audit.col.summary'), cell: (row) => <AuditSummaryButton recordId={row.id} summary={row.summary} onOpen={() => onOpen(row)} /> },
    ],
    // Stable while the language stays: new columns would remount the cells, and the button that opened the drawer
    // would be gone when focus goes back to it. `labels` changes with the language only, as `t` does.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, onOpen],
  );

  return (
    <DataTable
      caption={t('audit.list')}
      columns={columns}
      data={loading ? [] : rows}
      rowKey={(row) => row.id}
      pageSize={AUDIT_PAGE_SIZE}
      pageIndex={pageIndex}
      total={total}
      onPageChange={onPageChange}
      summary={summary}
      loading={loading}
      loadingLabel={t('audit.loading')}
      loadingRows={6}
      busy={busy}
      onRowClick={onOpen}
      variant={compact ? 'compact' : 'default'}
      rows={{
        lead: (row) => (
          <AuditSummaryButton
            recordId={row.id}
            summary={row.summary}
            caption={`${labels.entityType(row.entityType, row.entityLabel)} · ${labels.actor(row.actorName, row.actorId)}`}
           
            onOpen={() => onOpen(row)}
          />
        ),
        meta: (row) => <AuditActionBadge action={row.action} />,
        metaLabel: t('audit.col.action'),
        end: (row) => (
          <time dateTime={row.occurredAt} className="text-caption font-normal text-ink-muted tabular-nums">
            {formatDayMonthTime(row.occurredAt)}
          </time>
        ),
        endLabel: t('audit.col.time'),
        action: () => <ChevronRight aria-hidden="true" className="mx-3 size-5 stroke-[1.5] text-ink-muted" />,
      }}
    />
  );
}
