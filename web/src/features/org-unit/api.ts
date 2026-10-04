// Org structure API (Đơn vị tổ chức). Contract: "## API contract" comment on issue #5.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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

/** Mirrors the backend record `OrgUnitUpdateRequest`. `headEmployeeId` stays null until Employees exist (HRM-06). */
export type OrgUnitUpdateRequest = { name: string; code: string; type: OrgUnitType; headEmployeeId: string | null };

/** Mirrors the backend record `OrgUnitCreateRequest`; `parentId: null` puts the unit directly under the company. */
export type OrgUnitCreateRequest = OrgUnitUpdateRequest & { parentId: string | null };

/** A write to the tree. The tree is refetched before the mutation settles, also after a failure (its cause may be stale data). */
function useOrgUnitMutation<TInput, TOutput = OrgUnit>(mutationFn: (input: TInput) => Promise<TOutput>, onSuccess?: (output: TOutput, input: TInput) => void) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn, onSuccess, onSettled: () => queryClient.invalidateQueries({ queryKey: ORG_STRUCTURE_KEY }) });
}

export function useCreateOrgUnit() {
  return useOrgUnitMutation((body: OrgUnitCreateRequest) => api<OrgUnit>('/api/org-units', { method: 'POST', body }));
}

export function useUpdateOrgUnit() {
  return useOrgUnitMutation(({ id, body }: { id: string; body: OrgUnitUpdateRequest }) => api<OrgUnit>(`/api/org-units/${id}`, { method: 'PUT', body }));
}

/** `parentId: null` moves the unit directly under the company. The unit keeps its child units, head and code. */
export function useMoveOrgUnit() {
  return useOrgUnitMutation(({ id, parentId }: { id: string; parentId: string | null }) => api<OrgUnit>(`/api/org-units/${id}/move`, { method: 'POST', body: { parentId } }));
}

/** Always allowed, and it does not cascade: child units and employees stay as they are. */
export function useDeactivateOrgUnit() {
  return useOrgUnitMutation((id: string) => api<OrgUnit>(`/api/org-units/${id}/deactivate`, { method: 'POST' }));
}

export function useReactivateOrgUnit() {
  return useOrgUnitMutation((id: string) => api<OrgUnit>(`/api/org-units/${id}/reactivate`, { method: 'POST' }));
}

/** Extra fields of 409 `org_unit.not_empty`: employees assigned to the unit itself, and its direct child units. */
export type OrgUnitNotEmpty = { employeeCount: number; childCount: number };

/** `onDeleted` runs before the tree is refetched, so the selection can leave the unit while it is still known. */
export function useDeleteOrgUnit(onDeleted: (id: string) => void) {
  return useOrgUnitMutation(
    (id: string) => api(`/api/org-units/${id}`, { method: 'DELETE' }),
    (_, id) => onDeleted(id),
  );
}
