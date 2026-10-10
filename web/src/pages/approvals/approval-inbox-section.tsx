// One tab of the inbox: the filter bar and the table with its loading, empty, no-match and error states (P10).
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { APPROVAL_PAGE_SIZE, useApprovalDelegations, useApprovalInbox } from '@/features/approval/api';
import { ApprovalFilterBar } from '@/features/approval/components/approval-filter-bar';
import { ApprovalInboxEmpty } from '@/features/approval/components/approval-inbox-empty';
import { ApprovalInboxTable } from '@/features/approval/components/approval-inbox-table';
import type { ApprovalFilters } from '@/features/approval/use-approval-filters';

export type ApprovalInboxSectionProps = {
  filters: ApprovalFilters;
  compact: boolean;
};

export function ApprovalInboxSection({ filters, compact }: ApprovalInboxSectionProps) {
  const { t } = useTranslation();
  const inbox = useApprovalInbox(filters.query);
  const delegate = (useApprovalDelegations().data?.received ?? []).some((d) => d.status === 'ACTIVE');
  const { data } = inbox;
  // A page past the end (a stale link, or requests that were handled meanwhile): go to the last page with rows.
  const lastPage = data ? Math.max(0, Math.ceil(data.total / APPROVAL_PAGE_SIZE) - 1) : 0;
  const pastEnd = Boolean(data) && !inbox.isPlaceholderData && filters.query.page > lastPage;
  const { setPage } = filters;
  useEffect(() => {
    if (pastEnd) setPage(lastPage, true);
    // `setPage` is new on every render.
  }, [pastEnd, lastPage]);

  const empty = !inbox.isError && data?.total === 0;
  return (
    <>
      <ApprovalFilterBar filters={filters} compact={compact} delegate={delegate} />
      <div>
        {/* Always in the page, so a search that ends with nothing is announced. */}
        <div role="status">{empty ? <ApprovalInboxEmpty filters={filters} /> : null}</div>
        {inbox.isError ? (
          <Card bare>
            <ErrorState title={t('approvals.loadError')} onRetry={() => void inbox.refetch()} />
          </Card>
        ) : empty ? null : (
          <ApprovalInboxTable
            box={filters.query.box}
            rows={data?.items ?? []}
            total={data?.total ?? 0}
            pageIndex={data?.pageIndex ?? 0}
            onPageChange={(page) => filters.setPage(page)}
            loading={!data}
            busy={inbox.isPlaceholderData}
            compact={compact}
          />
        )}
      </div>
    </>
  );
}
