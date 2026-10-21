// Lịch phân ca API (HRM-22/BE-3): `GET /api/shift-calendar`. A row lists only the days that have a shift; the caller sees the
// people their data scope covers (with SHIFT_VIEW), nobody else's. The range is at most 62 days, a page at most 500 people.
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { EmployeeCard } from '@/features/approval/api';
import { api } from '@/lib/api';

/** FULL: a working day; MORNING: a half working day (Saturday morning); OFF: the weekly day off. */
export type DayKind = 'FULL' | 'MORNING' | 'OFF';

export type CalendarDay = { date: string; /** The name of the Ngày lễ, or null. */ holiday: string | null; dayKind: DayKind };

/** A shift as a cell shows it. A `crossesMidnight` shift ends on the day after the cell's day. */
export type CalendarShift = { id: string; code: string; name: string; startTime: string; endTime: string; crossesMidnight: boolean; active: boolean };

/** ASSIGNED: a Phân ca of the person; DEFAULT: the Ca mặc định of their unit. */
export type CellSource = 'ASSIGNED' | 'DEFAULT';

export type CalendarCell = { date: string; shiftId: string; source: CellSource };

export type CalendarRow = { employee: EmployeeCard; orgUnitId: string | null; cells: CalendarCell[] };

export type ShiftCalendar = { from: string; to: string; days: CalendarDay[]; shifts: CalendarShift[]; rows: CalendarRow[]; total: number; page: number; size: number };

/** `''` means no filter. `page` counts from 0. */
export type ShiftCalendarQuery = { from: string; to: string; orgUnitId: string; employeeId: string; shiftId: string; page: number; size: number };

export const SHIFT_CALENDAR_KEY = ['shift-calendar'] as const;

/** The most people one call returns. */
export const CALENDAR_MAX_SIZE = 500;

export function shiftCalendarPath(query: ShiftCalendarQuery): string {
  const search = new URLSearchParams({ from: query.from, to: query.to, page: String(query.page), size: String(query.size) });
  if (query.orgUnitId) search.set('orgUnitId', query.orgUnitId);
  if (query.employeeId) search.set('employeeId', query.employeeId);
  if (query.shiftId) search.set('shiftId', query.shiftId);
  return `/api/shift-calendar?${search}`;
}

/** Who works which shift in a range; the rows of the previous query stay while the next one loads. 403 for no right to read it. */
export function useShiftCalendar(query: ShiftCalendarQuery, enabled = true) {
  return useQuery({
    queryKey: [...SHIFT_CALENDAR_KEY, query],
    queryFn: () => api<ShiftCalendar>(shiftCalendarPath(query)),
    placeholderData: keepPreviousData,
    enabled,
    retry: false,
  });
}
