// Projects API (Dự án, HRM-15). Contract: "## API contract" comment on issue #17.
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export const PROJECT_STATUSES = ['PLANNED', 'ACTIVE', 'ON_HOLD', 'CLOSED'] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

/** Mirrors the backend record `EmployeeCard`: a person as a list row names them. */
export type EmployeeCard = { id: string; code: string; fullName: string; orgUnitName: string | null };

/** Mirrors the backend record `ProjectUnitRef`: the Phòng ban phụ trách. */
export type ProjectUnitRef = { id: string; name: string; active: boolean };

/** Mirrors the backend record `ProjectMembers`: distinct Employees with a running / upcoming allocation, and how many of them are Quá tải from today on. */
export type ProjectMembers = { running: number; upcoming: number; overloaded: number };

/** Mirrors the backend record `ProjectListItem`. Dates are ISO. */
export type ProjectListItem = {
  id: string;
  code: string;
  name: string;
  /** Null: an internal project. */
  client: string | null;
  pm: EmployeeCard | null;
  orgUnit: ProjectUnitRef | null;
  startDate: string;
  endDate: string;
  status: ProjectStatus;
  /** Whether the caller may edit it and its allocations. */
  canEdit: boolean;
  members: ProjectMembers;
};

export type ProjectPage = { items: ProjectListItem[]; total: number };

export const PROJECT_PAGE_SIZE = 20;

/** `''` means no filter; `status` is the API value, `''` for every status but CLOSED (the API's default). */
export type ProjectListQuery = {
  page: number;
  q: string;
  mine: boolean;
  status: string;
  orgUnitId: string;
  overloaded: boolean;
};

export const PROJECTS_KEY = ['projects'] as const;

export function projectsPath(query: ProjectListQuery, size = PROJECT_PAGE_SIZE): string {
  const search = new URLSearchParams({ page: String(query.page), size: String(size) });
  if (query.q) search.set('q', query.q);
  if (query.mine) search.set('mine', 'true');
  if (query.status) search.set('status', query.status);
  if (query.orgUnitId) search.set('orgUnitId', query.orgUnitId);
  if (query.overloaded) search.set('overloaded', 'true');
  return `/api/projects?${search}`;
}

/** One page of projects, newest start first. The rows of the previous query stay while the next one loads. */
export function useProjects(query: ProjectListQuery, enabled = true) {
  return useQuery({
    queryKey: [...PROJECTS_KEY, 'list', query],
    queryFn: async () => ({ ...(await api<ProjectPage>(projectsPath(query))), pageIndex: query.page }),
    placeholderData: keepPreviousData,
    enabled,
  });
}

/** How many projects a query finds, without their rows (the tab counts, the closed projects left out). */
export function useProjectCount(query: ProjectListQuery, enabled = true) {
  return useQuery({
    queryKey: [...PROJECTS_KEY, 'count', { ...query, page: 0 }],
    queryFn: async () => (await api<ProjectPage>(projectsPath({ ...query, page: 0 }, 1))).total,
    enabled,
  });
}
