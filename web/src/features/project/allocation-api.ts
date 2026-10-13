// Allocations of a project: the candidates, the "try allocation" check, and the writes (add, edit, end early, delete).
// Contract: "## Allocations (BE-3, #188)" in the "## API contract" comment on issue #17. The reads are in `api.ts`.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { CATALOGS_KEY, type CatalogPage } from '@/features/catalog/api';
import { PROJECTS_KEY, type Allocation, type EmployeeCard, type LoadPeriod, type ProjectRoleRef } from './api';

/** Mirrors the backend record `TryAllocationRequest`. `allocationId`: the allocation being edited, replaced in the check. */
export type TryAllocationRequest = { allocationId: string | null; employeeId: string; percent: number; startDate: string; endDate: string };

/** Mirrors the backend record `TryAllocationResponse`: nothing is saved. */
export type TryAllocationResult = {
  employee: EmployeeCard | null;
  /** The highest Tải phân bổ of the Employee within the periods. */
  peak: number;
  overloaded: boolean;
  /** From the 1st of the start month to the end date: the rows of the dialog. */
  periods: LoadPeriod[];
  /** Within the allocation's own range. */
  overloadedPeriods: LoadPeriod[];
  /** The percent that keeps the peak at 100%, or null. */
  suggestedMaxPercent: number | null;
  /** The first day after the overlap ends, or null. */
  suggestedStart: string | null;
};

/** The allocation being typed in the dialog, checked as the user changes it. `null`: not complete yet, no call. */
export function useTryAllocation(projectId: string, request: TryAllocationRequest | null) {
  return useQuery({
    queryKey: [...PROJECTS_KEY, 'try-allocation', projectId, request],
    queryFn: () => api<TryAllocationResult>(`/api/projects/${projectId}/allocations/try`, { method: 'POST', body: request }),
    enabled: request !== null,
    retry: false,
    staleTime: 0,
  });
}

/** Mirrors the backend record `AllocationCandidate`: an active Employee with the load today. */
export type AllocationCandidate = { employee: EmployeeCard; loadToday: number; inProjectFrom: string | null };

/** At most 20 active Employees by name or code, for the picker of the add dialog. */
export function useAllocationCandidates(projectId: string, q: string, enabled = true) {
  return useQuery({
    queryKey: [...PROJECTS_KEY, 'allocation-candidates', projectId, q],
    queryFn: () => api<AllocationCandidate[]>(`/api/projects/${projectId}/allocation-candidates${q ? `?q=${encodeURIComponent(q)}` : ''}`),
    enabled,
  });
}

/** The Vai trò dự án an allocation can take: the active items of the catalog. */
export function useProjectRoles() {
  return useQuery({
    queryKey: [...CATALOGS_KEY, 'project-roles', 'active'],
    queryFn: async (): Promise<ProjectRoleRef[]> =>
      (await api<CatalogPage>('/api/catalogs/project-roles/items?page=0&size=200&status=ACTIVE')).items.map((item) => ({ id: item.id, code: item.code, name: item.name, active: item.active })),
  });
}

/** Mirrors the backend records `AllocationRequest` and `AllocationUpdateRequest` (no `employeeId`: the Employee never changes). */
export type AllocationUpdateRequest = { projectRoleId: string; percent: number; startDate: string; endDate: string };
export type AllocationCreateRequest = AllocationUpdateRequest & { employeeId: string };

/** Mirrors the backend record `AllocationSaveResponse`; `check.overloaded` tells the UI to warn after saving. */
export type AllocationSaveResponse = { allocation: Allocation; check: TryAllocationResult };

/** A write to the allocations: every project query is refetched afterwards (counts, overload alerts, the heat cells). */
function useAllocationMutation<TInput, TResult>(mutationFn: (input: TInput) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn, onSettled: () => queryClient.invalidateQueries({ queryKey: PROJECTS_KEY }) });
}

export type AllocationSaveInput = { projectId: string; allocationId: string | null; body: AllocationCreateRequest | AllocationUpdateRequest };

/** Adds (`allocationId` null) or edits an allocation. Saving an overload succeeds. */
export function useSaveAllocation() {
  return useAllocationMutation(({ projectId, allocationId, body }: AllocationSaveInput) =>
    allocationId === null
      ? api<AllocationSaveResponse>(`/api/projects/${projectId}/allocations`, { method: 'POST', body })
      : api<AllocationSaveResponse>(`/api/projects/${projectId}/allocations/${allocationId}`, { method: 'PUT', body }),
  );
}

/** Ends a running allocation on `endDate`, earlier than planned. */
export function useEndAllocation() {
  return useAllocationMutation(({ projectId, allocationId, endDate }: { projectId: string; allocationId: string; endDate: string }) =>
    api<AllocationSaveResponse>(`/api/projects/${projectId}/allocations/${allocationId}/end`, { method: 'POST', body: { endDate } }),
  );
}

/** Deletes an allocation that has not started. */
export function useDeleteAllocation() {
  return useAllocationMutation(({ projectId, allocationId }: { projectId: string; allocationId: string }) =>
    api<void>(`/api/projects/${projectId}/allocations/${allocationId}`, { method: 'DELETE' }),
  );
}
