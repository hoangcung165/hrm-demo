// Ca làm việc API. Contract: BE-1 of HRM-22 (`/api/shifts`).
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export const ROUNDING_MODES = ['NONE', 'UP', 'DOWN', 'NEAREST'] as const;
export type RoundingMode = (typeof ROUNDING_MODES)[number];

/** The rounding steps the backend accepts, in minutes. */
export const ROUNDING_STEPS = [5, 10, 15, 30] as const;

/** Mirrors the backend record `ShiftResponse`. Times are "HH:mm". */
export type Shift = {
  id: string;
  code: string;
  name: string;
  startTime: string;
  endTime: string;
  breakStart: string | null;
  breakEnd: string | null;
  lateToleranceMinutes: number;
  earlyToleranceMinutes: number;
  roundingMode: RoundingMode;
  roundingMinutes: number | null;
  active: boolean;
  /** The end is at or before the start: the shift ends the next day and belongs to the day it starts. */
  crossesMidnight: boolean;
  /** Length of the shift minus the break. */
  scheduledMinutes: number;
  /** Scheduled minutes between 22:00 and 06:00. */
  nightMinutes: number;
};

/** Mirrors the backend record `ShiftRequest`; the code is read when adding only. */
export type ShiftRequest = Pick<
  Shift,
  'code' | 'name' | 'startTime' | 'endTime' | 'breakStart' | 'breakEnd' | 'lateToleranceMinutes' | 'earlyToleranceMinutes' | 'roundingMode' | 'roundingMinutes'
>;

export const SHIFTS_KEY = ['shifts'] as const;

/** Every shift, earliest start first; the page filters by status. */
export function useShifts(enabled = true) {
  return useQuery({ queryKey: SHIFTS_KEY, queryFn: () => api<Shift[]>('/api/shifts'), enabled });
}

/** Every change reloads the list (and whatever else shows shifts). */
function useShiftMutation<TInput>(mutationFn: (input: TInput) => Promise<Shift>) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn, onSettled: () => queryClient.invalidateQueries({ queryKey: SHIFTS_KEY }) });
}

export function useCreateShift() {
  return useShiftMutation((body: ShiftRequest) => api<Shift>('/api/shifts', { method: 'POST', body }));
}

export function useUpdateShift() {
  return useShiftMutation(({ id, body }: { id: string; body: ShiftRequest }) => api<Shift>(`/api/shifts/${id}`, { method: 'PUT', body }));
}

export function useDeactivateShift() {
  return useShiftMutation((id: string) => api<Shift>(`/api/shifts/${id}/deactivate`, { method: 'POST' }));
}

export function useReactivateShift() {
  return useShiftMutation((id: string) => api<Shift>(`/api/shifts/${id}/reactivate`, { method: 'POST' }));
}
