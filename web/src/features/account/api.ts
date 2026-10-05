// Account API (Tài khoản). Contract: "## API contract" comment on issue #6.
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { DataScope, Role } from '@/features/auth/account';
import { api } from '@/lib/api';

export const ACCOUNT_STATUSES = ['ACTIVE', 'LOCKED'] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

/** Mirrors the backend record `AccountEmployee`; always null until HRM-06. */
export type AccountEmployee = { employeeId: string; fullName: string; employeeCode: string; orgUnitName: string | null };

/** Mirrors the backend record `AccountResponse`. */
export type AccountRow = {
  id: string;
  email: string;
  fullName: string;
  roles: Role[];
  /** The widest data scope of the Account's roles. */
  dataScope: DataScope;
  status: AccountStatus;
  employee: AccountEmployee | null;
  /** Persona key of a demo Account, or null. */
  demoPersona: string | null;
  createdAt: string;
};

/** Mirrors the backend record `PageResponse`. */
export type AccountPage = { items: AccountRow[]; total: number };

export const ACCOUNT_PAGE_SIZE = 20;

/** `''` means no filter. `page` counts from 0, as the API does. */
export type AccountListQuery = { page: number; q: string; role: Role | ''; status: AccountStatus | '' };

export const ACCOUNTS_KEY = ['accounts'] as const;

function accountsPath({ page, q, role, status }: AccountListQuery): string {
  const search = new URLSearchParams({ page: String(page), size: String(ACCOUNT_PAGE_SIZE) });
  if (q) search.set('q', q);
  if (role) search.set('role', role);
  if (status) search.set('status', status);
  return `/api/accounts?${search}`;
}

/**
 * One page of Accounts, sorted by full name. The rows of the previous query stay while the next one loads;
 * `pageIndex` says which page the rows in hand are, so the summary never runs ahead of them.
 */
export function useAccounts(query: AccountListQuery) {
  return useQuery({
    queryKey: [...ACCOUNTS_KEY, query],
    queryFn: async () => ({ ...(await api<AccountPage>(accountsPath(query))), pageIndex: query.page }),
    placeholderData: keepPreviousData,
  });
}

/** Mirrors the backend record `AccountUpdateRequest`. `employeeId` stays as it is until Employees exist (HRM-06). */
export type AccountUpdateRequest = { fullName: string; email: string; roles: Role[]; employeeId: string | null };

/** Mirrors the backend record `AccountCreateRequest`: a temporary password the Admin hands over. */
export type AccountCreateRequest = AccountUpdateRequest & { password: string };

/** A write to an Account. The list is refetched before the mutation settles, also after a failure (its cause may be stale data). */
function useAccountMutation<TInput>(mutationFn: (input: TInput) => Promise<AccountRow>) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn, onSettled: () => queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY }) });
}

export function useCreateAccount() {
  return useAccountMutation((body: AccountCreateRequest) => api<AccountRow>('/api/accounts', { method: 'POST', body }));
}

export function useUpdateAccount() {
  return useAccountMutation(({ id, body }: { id: string; body: AccountUpdateRequest }) => api<AccountRow>(`/api/accounts/${id}`, { method: 'PUT', body }));
}
