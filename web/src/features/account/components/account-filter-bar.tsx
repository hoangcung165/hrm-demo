// Filter bar of the Account list: search, role, status and "Xóa bộ lọc" while a filter is set.
import { Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { ROLES, type Role } from '@/features/auth/account';
import { ACCOUNT_STATUSES, type AccountStatus } from '../api';
import { SEARCH_MAX_LENGTH, type useAccountFilters } from '../use-account-filters';

export type AccountFilterBarProps = {
  filters: ReturnType<typeof useAccountFilters>;
  /** While the list loads for the first time. */
  disabled?: boolean;
};

// The Select has no empty value: this one stands for "no filter".
const ALL = 'ALL';
// 44px controls below md.
const SELECT = 'max-md:h-11 max-md:min-w-0 max-md:flex-1 md:w-50';

export function AccountFilterBar({ filters, disabled = false }: AccountFilterBarProps) {
  const { t } = useTranslation();
  const { query } = filters;
  return (
    <div role="search" aria-label={t('accounts.filter.label')} className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <Input
        type="search"
        aria-label={t('accounts.filter.search')}
        placeholder={t('accounts.filter.searchPlaceholder')}
        value={filters.search}
        maxLength={SEARCH_MAX_LENGTH}
        disabled={disabled}
        onChange={(event) => filters.setSearch(event.target.value)}
        leading={<Search aria-hidden="true" />}
        wrapperClassName="h-11 basis-full md:h-10 md:w-80 md:basis-auto"
        className="[&::-webkit-search-cancel-button]:hidden"
        trailing={
          filters.search ? (
            <button
              type="button"
              aria-label={t('accounts.filter.clearSearch')}
              onClick={() => filters.setSearch('')}
              className="-mr-3 grid size-11 shrink-0 cursor-pointer place-items-center rounded-sm text-ink-muted hover:bg-surface-muted md:-mr-2 md:size-8 [&_svg]:size-4 [&_svg]:stroke-[1.5]"
            >
              <X aria-hidden="true" />
            </button>
          ) : null
        }
      />
      <Select
        aria-label={t('accounts.filter.role')}
        value={query.role || ALL}
        onChange={(value) => filters.setRole(value === ALL ? '' : (value as Role))}
        options={[{ value: ALL, label: t('accounts.filter.allRoles') }, ...ROLES.map((role) => ({ value: role, label: t(`role.${role}`) }))]}
        placeholder={t('accounts.filter.allRoles')}
        disabled={disabled}
        className={SELECT}
      />
      <Select
        aria-label={t('accounts.filter.status')}
        value={query.status || ALL}
        onChange={(value) => filters.setStatus(value === ALL ? '' : (value as AccountStatus))}
        options={[{ value: ALL, label: t('accounts.filter.allStatuses') }, ...ACCOUNT_STATUSES.map((status) => ({ value: status, label: t(`accounts.status.${status}`) }))]}
        placeholder={t('accounts.filter.allStatuses')}
        disabled={disabled}
        className={SELECT}
      />
      {filters.filtered ? (
        // Below md on its own line, so the two Selects keep half the width each.
        <Button variant="ghost" size="sm" className="h-11 shrink-0 max-md:basis-full md:h-8" onClick={filters.clear}>
          {t('accounts.filter.clear')}
        </Button>
      ) : null}
    </div>
  );
}
