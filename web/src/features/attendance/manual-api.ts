// Công thủ công (HRM-24/BE-2, #394): `GET / PUT / DELETE /api/attendance/manual`, contract on issue #26. Needs
// ATTENDANCE_MANUAL; people or a unit with the units below it, up to 62 days, no day after today. Saving or clearing
// changes the Công theo ngày, so both refresh it.
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { EmployeeCard } from '@/features/approval/api';
import { api } from '@/lib/api';
import type { ManualKind } from './daily-api';
import { ATTENDANCE_DAILY_KEY } from './import-api';

export const ATTENDANCE_MANUAL_KEY = ['attendance', 'manual'] as const;

/** `in` and `out` are "HH:mm", for TIMES only. */
export type ManualEntryItem = { date: string; kind: ManualKind; in: string | null; out: string | null; note: string | null; enteredBy: string | null; enteredAt: string };

/** `shiftDays`: the days of the range with a Ca làm việc, the only ones that take an entry. */
export type ManualRow = { employee: EmployeeCard; orgUnitId: string | null; shiftDays: string[]; entries: ManualEntryItem[] };

export type ManualAttendance = { from: string; to: string; rows: ManualRow[] };

/** Who a save or clear is for: a unit (with the units below it) or some people. */
export type ManualTarget = { orgUnitId: string } | { employeeIds: string[] };

export type ManualSave = ManualTarget & { from: string; to: string; days?: string[]; kind: ManualKind; in?: string; out?: string; note?: string };
export type ManualClear = ManualTarget & { from: string; to: string; days?: string[] };

export type ManualSaveResult = { employees: number; created: number; replaced: number; unchanged: number; skipped: Array<{ date: string; reason: 'NO_SHIFT'; employees: number }> };
export type ManualClearResult = { employees: number; removed: number };

/** The entries of a unit for a range; the previous rows stay while the next week loads. Not asked without a unit. */
export function useManualAttendance(query: { orgUnitId: string; from: string; to: string }) {
  return useQuery({
    queryKey: [...ATTENDANCE_MANUAL_KEY, query],
    queryFn: () => api<ManualAttendance>(`/api/attendance/manual?${new URLSearchParams(query)}`),
    placeholderData: keepPreviousData,
    enabled: query.orgUnitId !== '',
    retry: false,
  });
}

function useRefresh() {
  const client = useQueryClient();
  return () => Promise.all([client.invalidateQueries({ queryKey: ATTENDANCE_MANUAL_KEY }), client.invalidateQueries({ queryKey: ATTENDANCE_DAILY_KEY })]);
}

export function useSaveManual() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (body: ManualSave) => api<ManualSaveResult>('/api/attendance/manual', { method: 'PUT', body }),
    onSuccess: refresh,
  });
}

export function useClearManual() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (body: ManualClear) => api<ManualClearResult>('/api/attendance/manual', { method: 'DELETE', body }),
    onSuccess: refresh,
  });
}
