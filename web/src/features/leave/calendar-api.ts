// Lịch nghỉ phép API (HRM-19). Contract: "## API contract" comment on issue #21. The caller sees the days of their
// data scope only: the whole company for HR and the Giám đốc, their units for a head, themselves for anyone else.
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { EmployeeCard } from '@/features/approval/api';
import { projectsPath, type ProjectPage } from '@/features/project/api';
import { api } from '@/lib/api';
import { LEAVE_KEY, type LeaveTypeRef } from './api';

/** Mirrors `LeaveCalendarDay`: a day the request holds and which halves of it are off. */
export type LeaveCalendarDay = { date: string; morning: boolean; afternoon: boolean };

/** Mirrors `LeaveCalendarEntry`: one request with the days it holds in the range. Only waiting and approved ones. */
export type LeaveCalendarEntry = {
  requestId: string;
  employee: EmployeeCard;
  leaveType: LeaveTypeRef;
  status: 'APPROVED' | 'PENDING';
  days: LeaveCalendarDay[];
};

export type LeaveCalendarHoliday = { date: string; name: string };

export type LeaveCalendar = { from: string; to: string; holidays: LeaveCalendarHoliday[]; entries: LeaveCalendarEntry[] };

/** `''` means no filter. The range is at most 62 days. */
export type LeaveCalendarQuery = { from: string; to: string; orgUnitId: string; projectId: string };

export function calendarPath(query: LeaveCalendarQuery): string {
  const search = new URLSearchParams({ from: query.from, to: query.to });
  if (query.orgUnitId) search.set('orgUnitId', query.orgUnitId);
  if (query.projectId) search.set('projectId', query.projectId);
  return `/api/leave-calendar?${search}`;
}

/** Who is off in a range; the rows of the previous range stay while the next one loads. 403 for no right to read it. */
export function useLeaveCalendar(query: LeaveCalendarQuery) {
  return useQuery({
    queryKey: [...LEAVE_KEY, 'calendar', query],
    queryFn: () => api<LeaveCalendar>(calendarPath(query)),
    placeholderData: keepPreviousData,
    retry: false,
  });
}

/** The projects the project filter offers (every status but closed), for an Account that may list projects. */
export function useCalendarProjects(enabled: boolean) {
  return useQuery({
    queryKey: [...LEAVE_KEY, 'calendar', 'projects'],
    queryFn: async () => (await api<ProjectPage>(projectsPath({ page: 0, q: '', mine: false, status: '', orgUnitId: '', overloaded: false }, 100))).items,
    enabled,
  });
}
