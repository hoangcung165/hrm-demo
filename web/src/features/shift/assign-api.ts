// Phân ca and Ca mặc định API (HRM-22/BE-2): `PUT` and `DELETE /api/shift-assignments`, `PUT /api/org-units/{id}/default-shift`,
// and the read of the defaults, `GET /api/org-units/default-shifts`. Every change reloads the calendar.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { SHIFT_CALENDAR_KEY } from './calendar-api';

export const WEEKDAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'] as const;
export type Weekday = (typeof WEEKDAYS)[number];

/** Mirrors `ShiftAssignRequest`: give either `employeeIds` or `orgUnitId`. No `weekdays` means every working day. */
export type AssignRequest = { shiftId: string; employeeIds?: string[]; orgUnitId?: string; from: string; to: string; weekdays?: Weekday[] };

/** `reason` is HOLIDAY or DAY_OFF; `name` is the holiday's name. */
export type SkippedDay = { date: string; reason: 'HOLIDAY' | 'DAY_OFF'; name: string | null };

export type AssignResult = { employees: number; days: string[]; created: number; replaced: number; unchanged: number; skipped: SkippedDay[] };

export type ClearRequest = { employeeIds?: string[]; orgUnitId?: string; from: string; to: string };
export type ClearResult = { employees: number; removed: number };

/** A unit that has a Ca mặc định of its own. */
export type UnitDefaultShift = { orgUnitId: string; defaultShiftId: string | null };

export const DEFAULT_SHIFTS_KEY = ['shift-default-shifts'] as const;

/** The units that have their own Ca mặc định. */
export function useDefaultShifts(enabled = true) {
  return useQuery({ queryKey: DEFAULT_SHIFTS_KEY, queryFn: () => api<UnitDefaultShift[]>('/api/org-units/default-shifts'), enabled });
}

export function useAssignShifts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: AssignRequest) => api<AssignResult>('/api/shift-assignments', { method: 'PUT', body }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: SHIFT_CALENDAR_KEY }),
  });
}

export function useClearShifts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ClearRequest) => api<ClearResult>('/api/shift-assignments', { method: 'DELETE', body }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: SHIFT_CALENDAR_KEY }),
  });
}

/** `shiftId: null` clears the default. */
export function useSetDefaultShift() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orgUnitId, shiftId }: { orgUnitId: string; shiftId: string | null }) =>
      api<UnitDefaultShift>(`/api/org-units/${orgUnitId}/default-shift`, { method: 'PUT', body: { shiftId } }),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: DEFAULT_SHIFTS_KEY });
      return queryClient.invalidateQueries({ queryKey: SHIFT_CALENDAR_KEY });
    },
  });
}
