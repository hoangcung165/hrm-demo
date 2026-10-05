// "Tài khoản" tab: the filter bar and the Account list with its loading, no-match and error states.
import { Search } from 'lucide-react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { StateBlock } from '@/components/ui/state-block';
import { ACCOUNT_PAGE_SIZE, useAccounts } from '@/features/account/api';
import { AccountFilterBar } from '@/features/account/components/account-filter-bar';
import { AccountTable } from '@/features/account/components/account-table';
import { useAccountFilters } from '@/features/account/use-account-filters';
import { ApiError } from '@/lib/api';

export type AccountListSectionProps = {
  /** The API answered 403: the Account lost ACCOUNT_LIST after signing in. */
  onDenied: () => void;
};

export function AccountListSection({ onDenied }: AccountListSectionProps) {
  const { t } = useTranslation();
  const filters = useAccountFilters();
  const accounts = useAccounts(filters.query);
  const { data } = accounts;
  const denied = accounts.error instanceof ApiError && accounts.error.status === 403;
  // A page past the end (a stale link, or rows that went away): go to the last page that has rows.
  const lastPage = data ? Math.max(0, Math.ceil(data.total / ACCOUNT_PAGE_SIZE) - 1) : 0;
  const pastEnd = Boolean(data) && !accounts.isPlaceholderData && filters.query.page > lastPage;
  const { setPage } = filters;
  useEffect(() => {
    if (denied) onDenied();
    else if (pastEnd) setPage(lastPage, true);
    // `setPage` and `onDenied` are new on every render.
  }, [denied, pastEnd, lastPage]);

  const q = filters.query.q;
  const noMatch = !accounts.isError && data?.total === 0;
  return (
    <div className="flex flex-col gap-4">
      <AccountFilterBar filters={filters} disabled={accounts.isPending} />
      <div>
        {/* Always in the page, so a search that ends with nothing is announced, as the Pagination summary is when there are rows. */}
        <div role="status">
          {noMatch ? (
            <Card bare>
              <StateBlock
                variant="plain"
                icon={<Search />}
                title={q ? t('accounts.noMatch.titleQuery', { query: q }) : t('accounts.noMatch.title')}
                description={t('accounts.noMatch.text')}
                actions={
                  <Button variant="secondary" size="sm" onClick={filters.clear}>
                    {t('accounts.filter.clear')}
                  </Button>
                }
              />
            </Card>
          ) : null}
        </div>
        {accounts.isError ? (
          denied ? null : (
            <Card bare>
              <ErrorState title={t('accounts.loadError')} onRetry={() => void accounts.refetch()} />
            </Card>
          )
        ) : noMatch ? null : (
          <AccountTable rows={data?.items ?? []} total={data?.total ?? 0} pageIndex={data?.pageIndex ?? 0} onPageChange={(page) => filters.setPage(page)} loading={!data} />
        )}
      </div>
    </div>
  );
}
