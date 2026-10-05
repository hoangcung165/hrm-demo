// Account API (Tài khoản). Contract: "## API contract" comment on issue #6.
import { keepPreviousData, useQuery } from '@tanstack/react-query';
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
