// The filters over the list, and the list in its states: loading (skeleton rows), rows, empty, no match, error with
// retry, denied. The API is not asked at all without the permissions.
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { ContractListFilterBar } from '@/features/contract/components/contract-list-filter-bar';
import { ContractListTable } from '@/features/contract/components/contract-list-table';
import { CONTRACT_LIST_PAGE_SIZE, useContractList } from '@/features/contract/list-api';
import { useContractListFilters } from '@/features/contract/use-contract-list-filters';
import { useCurrentAccount } from '@/features/auth/account-context';
import { ApiError } from '@/lib/api';
import { useMediaQuery } from '@/lib/use-media-query';
import { ContractListDenied } from './contract-list-denied';
import { ContractListEmpty } from './contract-list-empty';

export function ContractListSection() {
  const { t } = useTranslation();
  const { permissions } = useCurrentAccount();
  const allowed = permissions.includes('EMPLOYEE_VIEW') && permissions.includes('EMPLOYEE_SENSITIVE_VIEW');
  const compact = useMediaQuery('(max-width: 767px)');
  const filters = useContractListFilters();
  const result = useContractList(filters.query, allowed);
  const data = result.data;
  const settled = Boolean(data) && !result.isPlaceholderData;

  // A link or a reload on a page past the last one (the list got shorter) goes to the last page.
  const lastPage = Math.max(0, Math.ceil((data?.total ?? 0) / CONTRACT_LIST_PAGE_SIZE) - 1);
  const pastEnd = settled && filters.query.page > lastPage;
  useEffect(() => {
    if (pastEnd) filters.setPage(lastPage, true);
    // `filters` is new on every render; only the page matters here.
  }, [pastEnd, lastPage]);

  if (!allowed || (result.error instanceof ApiError && result.error.status === 403)) return <ContractListDenied />;
  const empty = settled && data?.total === 0;
  return (
    <div className="flex flex-col gap-4">
      <ContractListFilterBar filters={filters} />
      <div role="status">{empty ? <ContractListEmpty filters={filters} /> : null}</div>
      {result.isError ? (
        <Card bare>
          <ErrorState title={t('contractList.loadError')} onRetry={() => void result.refetch()} />
        </Card>
      ) : empty ? null : (
        <ContractListTable data={data} busy={result.isPlaceholderData} compact={compact} onPageChange={filters.setPage} />
      )}
    </div>
  );
}
