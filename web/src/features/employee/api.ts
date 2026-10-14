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
  nationality?: string;
  sort: EmployeeSort;
};

export const EMPLOYEES_KEY = ['employees'] as const;

/** The search, filters and order of a list query, as the list and the export send them. */
function appendFilters(search: URLSearchParams, { q, orgUnitId, includeSubUnits, positionId, status, nationality, sort }: EmployeeListQuery) {
  if (q) search.set('q', q);
  if (orgUnitId) {
    search.set('orgUnitId', orgUnitId);
    if (!includeSubUnits) search.set('includeSubUnits', 'false');
  }
  if (positionId) search.set('positionId', positionId);
  if (status) search.set('status', status);
  if (nationality) search.set('nationality', nationality);
  if (sort !== 'code') search.set('sort', SORT_PARAM[sort]);
  return search;
}

export function employeesPath(query: EmployeeListQuery): string {
  const search = new URLSearchParams({ page: String(query.page), size: String(EMPLOYEE_PAGE_SIZE) });
  return `/api/employees?${appendFilters(search, query)}`;
}

/** The .xlsx export of the list with the same filters and order (HRM-07); every page, so no `page` or `size`. */
export function employeesExportPath(query: EmployeeListQuery): string {
  const search = appendFilters(new URLSearchParams(), query).toString();
  return search ? `/api/employees/export?${search}` : '/api/employees/export';
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

export type Gender = 'MALE' | 'FEMALE';

/** Mirrors the backend record `EmergencyContact`. */
export type EmergencyContact = { name: string | null; relationship: string | null; phone: string | null };

/** Mirrors the backend record `EmployeePersonal`. Dates are ISO; the phone is stored as `0xxxxxxxxx`. */
export type EmployeePersonal = {
  dateOfBirth: string;
  gender: Gender;
  personalEmail: string | null;
  phone: string | null;
  address: string | null;
  emergencyContact: EmergencyContact | null;
};

/**
 * Mirrors the backend record `EmployeeIdentity` (Trường nhạy cảm). With `masked` every digit but the last four
 * is "•" and there is no way to reveal it; without it the numbers are full. A missing number is null either way.
 */
export type EmployeeIdentity = {
  masked: boolean;
  idNumber: string | null;
  idIssueDate: string | null;
  idIssuePlace: string | null;
  taxCode: string | null;
  socialInsuranceNumber: string | null;
};

/** `UNIT_HEAD`: follows the Trưởng đơn vị live; `ASSIGNED`: chosen by HR. */
export type ManagerSource = 'UNIT_HEAD' | 'ASSIGNED';

/** Mirrors the backend record `EmployeeJob`. `orgUnit` null: directly under the company. */
export type EmployeeJob = {
  orgUnit: EmployeeUnitRef | null;
  position: AssignmentRef;
  manager: EmployeeRef | null;
  managerSource: ManagerSource;
  hireDate: string;
};

/** Mirrors the backend record `EmployeeResponse`: one profile (hồ sơ nhân viên). */
export type EmployeeProfile = {
  id: string;
  code: string;
  fullName: string;
  status: EmployeeStatus;
  personal: EmployeePersonal;
  identity: EmployeeIdentity;
  job: EmployeeJob;
  createdAt: string;
  updatedAt: string;
};

/** One profile: one's own, or one within the data scope with EMPLOYEE_VIEW (403 otherwise, 404 when unknown). */
export function useEmployee(id: string, enabled = true) {
  return useQuery({ queryKey: [...EMPLOYEES_KEY, 'profile', id], queryFn: () => api<EmployeeProfile>(`/api/employees/${id}`), enabled });
}

/** Mirrors the backend record `EmployeeCreateRequest`. There is no code: the server issues the next one. */
export type EmployeeCreateRequest = {
  fullName: string;
  personal: Omit<EmployeePersonal, 'gender'> & { gender: Gender | null };
  identity: Omit<EmployeeIdentity, 'masked'>;
  job: { orgUnitId: string | null; positionId: string | null; managerId: string | null; hireDate: string | null; status: 'PROBATION' | 'OFFICIAL' };
};

/** Mirrors the backend record `EmployeeOption`: an active Employee in a picker. */
export type EmployeeOption = EmployeeRef & { status: EmployeeStatus; orgUnitName: string | null; positionName: string | null };
