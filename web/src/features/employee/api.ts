// Employees API (Nhân viên). Contract: "## API contract" comment on issue #8; the list rows also carry the effective
// Quản lý trực tiếp and the parent unit name ("## Decisions" on #8).
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { CATALOGS_KEY, type CatalogPage } from '@/features/catalog/api';
import { api } from '@/lib/api';

export const EMPLOYEE_STATUSES = ['PROBATION', 'OFFICIAL', 'INACTIVE'] as const;
export type EmployeeStatus = (typeof EMPLOYEE_STATUSES)[number];

/** Mirrors the backend record `EmployeeRef`: just enough to name an Employee. */
export type EmployeeRef = { id: string; code: string; fullName: string };

/** Mirrors the backend record `AssignmentRef`. `active` is false when the item was deactivated after it was assigned. */
export type AssignmentRef = { id: string; code: string; name: string; active: boolean };

/** Mirrors the backend record `EmployeeUnitRef`. `parentName` is null for a unit directly under the company. */
export type EmployeeUnitRef = AssignmentRef & { parentName: string | null };

/** Mirrors the backend record `EmployeeListItem`. No identity numbers: a row is the same for every caller. */
export type EmployeeListItem = {
  id: string;
  code: string;
  fullName: string;
  status: EmployeeStatus;
  /** Null: directly under the company. */
  orgUnit: EmployeeUnitRef | null;
  position: AssignmentRef | null;
  /** The effective Quản lý trực tiếp (chosen, or the unit head followed live); null when there is none. */
  manager: EmployeeRef | null;
  /** ISO date. */
  hireDate: string;
  phone: string | null;
  personalEmail: string | null;
};

export type EmployeePage = { items: EmployeeListItem[]; total: number };

export const EMPLOYEE_PAGE_SIZE = 20;

/** The orders the list offers (the desktop keeps the default); each maps to the API's `sort`. */
export const EMPLOYEE_SORTS = ['code', 'fullName', 'newest'] as const;
export type EmployeeSort = (typeof EMPLOYEE_SORTS)[number];
const SORT_PARAM: Record<EmployeeSort, string> = { code: 'code', fullName: 'fullName', newest: 'hireDate,desc' };

/** `''` means no filter. `page` counts from 0, as the API does. `status` is the API value, `''` for every status. */
export type EmployeeListQuery = {
  page: number;
  q: string;
  orgUnitId: string;
  /** With `orgUnitId`: also every unit below it (the API's default). */
  includeSubUnits: boolean;
  positionId: string;
  status: string;
  sort: EmployeeSort;
};

export const EMPLOYEES_KEY = ['employees'] as const;

export function employeesPath({ page, q, orgUnitId, includeSubUnits, positionId, status, sort }: EmployeeListQuery): string {
  const search = new URLSearchParams({ page: String(page), size: String(EMPLOYEE_PAGE_SIZE) });
  if (q) search.set('q', q);
  if (orgUnitId) {
    search.set('orgUnitId', orgUnitId);
    if (!includeSubUnits) search.set('includeSubUnits', 'false');
  }
  if (positionId) search.set('positionId', positionId);
  if (status) search.set('status', status);
  if (sort !== 'code') search.set('sort', SORT_PARAM[sort]);
  return `/api/employees?${search}`;
}

/**
 * One page of the Employees within the caller's data scope. The rows of the previous query stay while the next one
 * loads; `pageIndex` says which page the rows in hand are.
 */
export function useEmployees(query: EmployeeListQuery, enabled = true) {
  return useQuery({
    queryKey: [...EMPLOYEES_KEY, 'list', query],
    queryFn: async () => ({ ...(await api<EmployeePage>(employeesPath(query))), pageIndex: query.page }),
    placeholderData: keepPreviousData,
    enabled,
  });
}

/** Every Chức danh, by name, inactive ones included (a filter still finds the people who hold one). */
export function usePositions() {
  return useQuery({
    queryKey: [...CATALOGS_KEY, 'positions', 'all'],
    queryFn: async () => (await api<CatalogPage>('/api/catalogs/positions/items?page=0&size=200')).items,
  });
}
