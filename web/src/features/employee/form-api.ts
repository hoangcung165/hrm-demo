// The writes of the employee forms (add, the three card saves) and the lookups they need: the next code, the
// default manager of a unit, and the Employee picker. Contract: "## API contract" comments on issue #8.
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { EMPLOYEES_KEY, type EmployeeCreateRequest, type EmployeeOption, type EmployeeProfile, type EmployeeRef } from './api';

/** Adds an Employee; the lists and the next code are loaded again. 201 with the profile. */
export function useCreateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: EmployeeCreateRequest) => api<EmployeeProfile>('/api/employees', { method: 'POST', body }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: EMPLOYEES_KEY }),
  });
}

/** The code the next new Employee would get: a preview only (EMPLOYEE_EDIT). */
export function useNextEmployeeCode() {
  return useQuery({
    queryKey: [...EMPLOYEES_KEY, 'next-code'],
    queryFn: async () => (await api<{ code: string }>('/api/employees/next-code')).code,
  });
}

/**
 * Whom "Theo Trưởng đơn vị" resolves to for an Employee of the unit (`''`: directly under the company).
 * `employeeId`: the Employee being edited, who is skipped when they head the unit; absent on create.
 */
export function useDefaultManager(orgUnitId: string, employeeId?: string) {
  return useQuery({
    queryKey: [...EMPLOYEES_KEY, 'default-manager', orgUnitId, employeeId ?? null],
    queryFn: async () => {
      const search = new URLSearchParams();
      if (orgUnitId) search.set('orgUnitId', orgUnitId);
      if (employeeId) search.set('employeeId', employeeId);
      const query = search.toString();
      return (await api<{ manager: EmployeeRef | null }>(`/api/employees/default-manager${query ? `?${query}` : ''}`)).manager;
    },
  });
}

/**
 * Active Employees of the whole company by name, for the Quản lý trực tiếp picker; the first 20 matches.
 * `excludeId`: the Employee being edited, who cannot be their own manager.
 */
export function useEmployeeOptions(q: string, excludeId?: string, enabled = true) {
  return useQuery({
    queryKey: [...EMPLOYEES_KEY, 'options', q, excludeId ?? null],
    queryFn: async () => {
      const search = new URLSearchParams({ page: '0', size: '20' });
      if (q) search.set('q', q);
      if (excludeId) search.set('excludeId', excludeId);
      return (await api<{ items: EmployeeOption[]; total: number }>(`/api/employees/options?${search}`)).items;
    },
    placeholderData: keepPreviousData,
    enabled,
  });
}

/** The three parts of a profile that are saved on their own, each with its PUT and its body. */
export type ProfilePart = 'personal' | 'identity' | 'job';
export type ProfilePartBody = {
  personal: Pick<EmployeeCreateRequest, 'fullName' | 'personal'>;
  identity: EmployeeCreateRequest['identity'];
  job: EmployeeCreateRequest['job'];
};

/** Saves one part of a profile; the answer is the whole profile, which replaces the cached one. Lists reload. */
export function useSaveProfilePart<P extends ProfilePart>(id: string, part: P) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ProfilePartBody[P]) => api<EmployeeProfile>(`/api/employees/${id}/${part}`, { method: 'PUT', body }),
    onSuccess: async (profile) => {
      queryClient.setQueryData([...EMPLOYEES_KEY, 'profile', id], profile);
      await queryClient.invalidateQueries({ queryKey: EMPLOYEES_KEY, predicate: (query) => query.queryKey[1] !== 'profile' || query.queryKey[2] !== id });
    },
  });
}

