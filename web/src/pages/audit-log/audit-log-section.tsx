// The Audit log list: the filter bar and the table with its loading, empty, no-match, error and no-permission states,
// and the drawer a record opens (pattern P2).
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { AUDIT_PAGE_SIZE, useAuditLogs, type AuditLogListItem } from '@/features/audit/api';
import { AuditFilterBar } from '@/features/audit/components/audit-filter-bar';
import { AuditLogTable } from '@/features/audit/components/audit-log-table';
import { AuditRecordDrawer } from '@/features/audit/components/audit-record-drawer';
import type { AuditFilters } from '@/features/audit/use-audit-filters';
import { ApiError } from '@/lib/api';
import { formatNumber } from '@/lib/format';
import { useMediaQuery } from '@/lib/use-media-query';
import { AuditLogDenied } from './audit-log-denied';
import { AuditLogEmpty } from './audit-log-empty';

export type AuditLogSectionProps = { filters: AuditFilters };

export function AuditLogSection({ filters }: AuditLogSectionProps) {
  const { t } = useTranslation();
  const compact = useMediaQuery('(max-width: 767px)');
  const records = useAuditLogs(filters.query);
  const { data } = records;
  const [open, setOpen] = useState<AuditLogListItem | null>(null);
  const lastOpened = useRef<string | null>(null);
  const onOpen = useCallback((row: AuditLogListItem) => {
    lastOpened.current = row.id;
    setOpen(row);
  }, []);

  const lastPage = data ? Math.max(0, Math.ceil(data.total / AUDIT_PAGE_SIZE) - 1) : 0;
  const pastEnd = Boolean(data) && !records.isPlaceholderData && filters.query.page > lastPage;
  const { setPage } = filters;
  useEffect(() => {
    if (pastEnd) setPage(lastPage, true);
    // `setPage` is new on every render.
  }, [pastEnd, lastPage]);

  if (records.error instanceof ApiError && records.error.status === 403) return <AuditLogDenied />;
  const empty = !records.isError && data?.total === 0;
  const summary = ({ from, to, total }: { from: number; to: number; total: number }) =>
    t(compact ? 'audit.paginationShort' : 'audit.pagination', { from: formatNumber(from), to: formatNumber(to), total: formatNumber(total) });

  return (
    <div className="flex flex-col gap-4">
      <AuditFilterBar filters={filters} compact={compact} total={records.isFetching ? undefined : data?.total} disabled={records.isPending} />
      <div>
        <div role="status">{empty ? <AuditLogEmpty filters={filters} /> : null}</div>
        {records.isError ? (
          <Card bare>
            <ErrorState title={t('audit.loadError')} onRetry={() => void records.refetch()} />
          </Card>
        ) : empty ? null : (
          <AuditLogTable
            rows={data?.items ?? []}
            total={data?.total ?? 0}
            pageIndex={data?.pageIndex ?? 0}
            onPageChange={(page) => filters.setPage(page)}
            summary={summary}
            onOpen={onOpen}
            loading={!data}
            busy={records.isPlaceholderData}
            compact={compact}
          />
        )}
      </div>
      <AuditRecordDrawer
        row={open}
        onClose={() => setOpen(null)}
        fallbackFocus={() =>
          document.querySelector<HTMLElement>(`[data-audit-record="${lastOpened.current}"]`) ?? document.querySelector<HTMLElement>('[data-audit-record]')
        }
      />
    </div>
  );
}
