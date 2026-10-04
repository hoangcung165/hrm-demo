// Org structure API (Đơn vị tổ chức). Contract: "## API contract" comment on issue #5.
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type OrgUnitType = 'BRANCH' | 'DEPARTMENT' | 'TEAM';

/** Mirrors the backend record `OrgUnitHead`. On the company node only `fullName` and `position` are set. */
export type OrgUnitHead = {
  employeeId: string | null;
  fullName: string;
  employeeCode: string | null;
  position: string | null;
  avatarUrl: string | null;
};

type Headcounts = { head: OrgUnitHead | null; headcountDirect: number; headcountTotal: number; childCount: number };

/** Mirrors the backend record `OrgRootResponse`: the company, which is not a unit and has no id. */
export type OrgRoot = Headcounts & { name: string; type: 'COMPANY' };

/** Mirrors the backend record `OrgUnitResponse`. `parentId: null` means directly under the company. */
export type OrgUnit = Headcounts & {
  id: string;
  code: string;
  name: string;
  type: OrgUnitType;
  parentId: string | null;
  active: boolean;
  sortOrder: number;
};

/** Mirrors the backend record `OrgStructureResponse`: `units` is flat, parents before children, siblings in order. */
export type OrgStructure = { root: OrgRoot; units: OrgUnit[]; summary: { activeUnitCount: number; employeeCount: number } };

export const ORG_STRUCTURE_KEY = ['org-units'] as const;

/** The whole tree in one call; `enabled` is false for an Account without `ORG_VIEW`. */
export function useOrgStructure(enabled = true) {
  return useQuery({ queryKey: ORG_STRUCTURE_KEY, queryFn: () => api<OrgStructure>('/api/org-units'), enabled });
}
