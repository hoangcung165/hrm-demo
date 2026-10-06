// Search, filters and page of the Account list live in the URL (`q`, `role`, `status`, `page`), so they survive a
// reload and can be linked. The search box is local while typing and reaches the URL 300 ms after the last key.
import { ROLES, type Role } from '@/features/auth/account';
import { useUrlListQuery } from '@/lib/use-url-list-query';
import { ACCOUNT_STATUSES, type AccountListQuery, type AccountStatus } from './api';

export { SEARCH_MAX_LENGTH } from '@/lib/use-url-list-query';

const FILTERS = ['role', 'status'] as const;

const oneOf = <T extends string>(values: readonly T[], value: string | null): T | '' => (values.includes(value as T) ? (value as T) : '');

export function useAccountFilters() {
  const list = useUrlListQuery(FILTERS);
  const role = oneOf<Role>(ROLES, list.params.get('role'));
  const status = oneOf<AccountStatus>(ACCOUNT_STATUSES, list.params.get('status'));
  const query: AccountListQuery = { page: list.pageIndex, q: list.q, role, status };
  return {
    query,
    search: list.search,
    setSearch: list.setSearch,
    setRole: (value: Role | '') => list.setFilter('role', value),
    setStatus: (value: AccountStatus | '') => list.setFilter('status', value),
    setPage: list.setPage,
    filtered: Boolean(list.q || role || status || list.search.trim()),
    clear: list.clear,
  };
}
