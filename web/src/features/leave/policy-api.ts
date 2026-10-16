// Loại nghỉ and their Chính sách phép (HRM-18): read by the request form, changed on "Cấu hình nghỉ phép" with
// LEAVE_POLICY_EDIT. A policy is saved as a version from a date; requests already approved keep their days.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { LEAVE_KEY, type LeavePay } from './api';

export type LeaveAccrual = 'MONTHLY' | 'YEARLY';

/** Mirrors `LeavePolicyValues`. `carryOverExpiry` is "MM-DD". The limit fields are null for a type without a limit. */
export type LeavePolicyValues = {
  effectiveFrom: string;
  pay: LeavePay;
  halfDayAllowed: boolean;
  attachmentRequired: boolean;
  limited: boolean;
  entitlementDays: number | null;
  seniorityStepYears: number | null;
  accrual: LeaveAccrual | null;
  cutOffDay: number;
  advanceAllowed: boolean;
  maxDaysPerRequest: number | null;
  carryOverMaxDays: number | null;
  carryOverExpiry: string | null;
};

/** Mirrors `LeaveTypeResponse`: `policy` is the version in force today; `versions` only on the settings page. */
export type LeaveTypeItem = { id: string; code: string; name: string; sortOrder: number; active: boolean; policy: LeavePolicyValues | null; versions: LeavePolicyValues[] };

export type LeaveTypes = { items: LeaveTypeItem[]; canEdit: boolean };

const TYPES_KEY = [...LEAVE_KEY, 'types'] as const;

/** The active types with their policy today (`all`: every type with every version, needs LEAVE_POLICY_EDIT). */
export function useLeaveTypes(all = false, enabled = true) {
  return useQuery({
    queryKey: [...TYPES_KEY, all],
    queryFn: () => api<LeaveTypes>(`/api/leave-types${all ? '?all=true' : ''}`),
    enabled,
    retry: false,
  });
}

/** Any change to a type or its policy moves every balance, so the whole leave cache reloads. */
function useInvalidateLeave() {
  const queryClient = useQueryClient();
  return () => void queryClient.invalidateQueries({ queryKey: LEAVE_KEY });
}

export function useCreateLeaveType() {
  const invalidate = useInvalidateLeave();
  return useMutation({
    mutationFn: (body: { code: string; name: string; policy: LeavePolicyValues }) => api<LeaveTypeItem>('/api/leave-types', { method: 'POST', body }),
    onSuccess: invalidate,
  });
}

/** Renames the type, or turns it on or off. */
export function useUpdateLeaveType(id: string) {
  const invalidate = useInvalidateLeave();
  return useMutation({
    mutationFn: (body: { name: string; active: boolean }) => api<LeaveTypeItem>(`/api/leave-types/${id}`, { method: 'PUT', body }),
    onSuccess: invalidate,
  });
}

/** Saves a version of the policy from its date (the version of that date is replaced). */
export function useSaveLeavePolicy(id: string) {
  const invalidate = useInvalidateLeave();
  return useMutation({
    mutationFn: (body: LeavePolicyValues) => api<LeaveTypeItem>(`/api/leave-types/${id}/policy`, { method: 'PUT', body }),
    onSuccess: invalidate,
  });
}
