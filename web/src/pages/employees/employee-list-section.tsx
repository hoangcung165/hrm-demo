// The employee list: the filter bar and the table with its loading, empty company, no-match, error and
// no-permission states (pattern P10).
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { useCurrentAccount } from '@/features/auth/account-context';
import { EMPLOYEE_PAGE_SIZE, useEmployees } from '@/features/employee/api';
import { EmployeeFilterBar } from '@/features/employee/components/employee-filter-bar';
import { EmployeeTable } from '@/features/employee/components/employee-table';
import { useEmployeeFilters } from '@/features/employee/use-employee-filters';
import { ApiError } from '@/lib/api';
import { useMediaQuery } from '@/lib/use-media-query';
import { EmployeeListDenied } from './employee-list-denied';
import { EmployeeListEmpty } from './employee-list-empty';

export type EmployeeListSectionProps = {
  /** EMPLOYEE_EDIT: the empty company offers "Thêm nhân viên". */
  canAdd: boolean;
};

export function EmployeeListSection({ canAdd }: EmployeeListSectionProps) {
  const { t } = useTranslation();
  const unitFilter = useCurrentAccount().permissions.includes('ORG_VIEW');
  const compact = useMediaQuery('(max-width: 767px)');
  const filters = useEmployeeFilters();
  const employees = useEmployees(filters.query);
  const { data } = employees;
  const denied = employees.error instanceof ApiError && employees.error.status === 403;
  // A page past the end (a stale link, or rows that went away): go to the last page that has rows.
  const lastPage = data ? Math.max(0, Math.ceil(data.total / EMPLOYEE_PAGE_SIZE) - 1) : 0;
  const pastEnd = Boolean(data) && !employees.isPlaceholderData && filters.query.page > lastPage;
  const { setPage } = filters;
  useEffect(() => {
    if (pastEnd) setPage(lastPage, true);
    // `setPage` is new on every render.
  }, [pastEnd, lastPage]);

  // The API refused: EMPLOYEE_VIEW was taken away after signing in.
  if (denied) return <EmployeeListDenied />;
  const empty = !employees.isError && data?.total === 0;
  return (
    <div className="flex flex-col gap-4">
      <EmployeeFilterBar
        filters={filters}
        unitFilter={unitFilter}
        compact={compact}
        total={employees.isFetching ? undefined : data?.total}
        disabled={employees.isPending}
      />
      <div>
        {/* Always in the page, so a search that ends with nothing is announced. */}
        <div role="status">{empty ? <EmployeeListEmpty filters={filters} unitFilter={unitFilter} canAdd={canAdd} /> : null}</div>
        {employees.isError ? (
          <Card bare>
            <ErrorState title={t('employees.loadError')} onRetry={() => void employees.refetch()} />
          </Card>
        ) : empty ? null : (
          <EmployeeTable
            rows={data?.items ?? []}
            total={data?.total ?? 0}
            pageIndex={data?.pageIndex ?? 0}
            onPageChange={(page) => filters.setPage(page)}
            loading={!data}
            busy={employees.isPlaceholderData}
            compact={compact}
          />
        )}
      </div>
    </div>
  );
}
