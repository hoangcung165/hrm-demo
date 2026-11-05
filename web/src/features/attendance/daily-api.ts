// Công theo ngày API (HRM-23/BE-2, BE-4): `GET /api/attendance/daily` and `/daily/{employeeId}/{date}`. With
// ATTENDANCE_VIEW the caller reads their data scope, without it only their own days. A range is at most 62 days.
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { EmployeeCard } from '@/features/approval/api';
import { api } from '@/lib/api';
import { ATTENDANCE_DAILY_KEY } from './import-api';

/** `OUTSIDE_LOCATION` (Ngoài vùng) and `LOW_ACCURACY` (Sai số lớn) come from the mobile punch used as the In or the Out (HRM-39). */
export type DayFlag = 'MISSING_IN' | 'MISSING_OUT' | 'ABSENT' | 'DUPLICATE_PUNCH' | 'LEAVE' | 'HOLIDAY' | 'NO_SHIFT' | 'OUTSIDE_LOCATION' | 'LOW_ACCURACY';
export type LeavePart = 'WHOLE' | 'MORNING' | 'AFTERNOON';
export type TimeSource = 'PUNCH' | 'MANUAL' | 'ADJUSTMENT';
/** Where a punch was made: a punch machine or the Employee's phone (HRM-39). */
export type PunchOrigin = 'MACHINE' | 'MOBILE';
/** Đủ công, Nửa công, Vắng, or an In and an Out time (HRM-24). */
export type ManualKind = 'FULL' | 'HALF' | 'ABSENT' | 'TIMES';

export type DailyShift = { id: string; code: string; name: string; startTime: string; endTime: string; crossesMidnight: boolean; active: boolean };

export type DailyTotals = { workedDays: number; workedMinutes: number; lateDays: number; earlyLeaveDays: number; missingPunchDays: number; absentDays: number; leaveDays: number };

/** Times carry the company's offset (+07:00), so they read as wall-clock time. `noLog`: the log does not cover the day yet. */
export type DailyDay = {
  date: string;
  shiftId: string | null;
  in: string | null;
  out: string | null;
  workedMinutes: number;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  flags: DayFlag[];
  holiday: string | null;
  leave: LeavePart | null;
  noLog: boolean;
  /** Where In and Out come from: a punch, Công thủ công or an approved Đơn bổ sung công. */
  inSource: TimeSource | null;
  outSource: TimeSource | null;
  /** The day's Công thủ công, which alone decides it; null when it has none. */
  manual: ManualKind | null;
  /** Where the punch used as the In / Out was made; null when that time is missing or does not come from a punch. */
  inPunchSource: PunchOrigin | null;
  outPunchSource: PunchOrigin | null;
};

export type DailyRow = { employee: EmployeeCard; orgUnitId: string | null; totals: DailyTotals; days: DailyDay[] };

export type DailyAttendance = {
  from: string;
  to: string;
  coveredUntil: string | null;
  lastImportAt: string | null;
  shifts: DailyShift[];
  rows: DailyRow[];
  total: number;
  page: number;
  size: number;
};

export type DailySort = 'abnormal' | 'name';

/** `''` means no filter. `page` counts from 0. */
export type DailyQuery = { from: string; to: string; orgUnitId: string; employeeId: string; q: string; abnormalOnly: boolean; sort: DailySort; page: number; size: number };

/** The most days one call returns. */
export const DAILY_MAX_DAYS = 62;
export const DAILY_PAGE_SIZE = 10;

export function dailyPath(query: DailyQuery): string {
  const search = new URLSearchParams({ from: query.from, to: query.to, sort: query.sort, page: String(query.page), size: String(query.size) });
  if (query.orgUnitId) search.set('orgUnitId', query.orgUnitId);
  if (query.employeeId) search.set('employeeId', query.employeeId);
  if (query.q) search.set('q', query.q);
  if (query.abnormalOnly) search.set('abnormalOnly', 'true');
  return `/api/attendance/daily?${search}`;
}

/** The days of a range; the rows of the previous query stay while the next one loads. Not asked while `enabled` is false. */
export function useDailyAttendance(query: DailyQuery, enabled = true) {
  return useQuery({
    queryKey: [...ATTENDANCE_DAILY_KEY, query],
    queryFn: () => api<DailyAttendance>(dailyPath(query)),
    placeholderData: keepPreviousData,
    enabled,
    retry: false,
  });
}

/** `NOT_USED`: the day has Công thủ công, which replaces its punches. */
export type PunchRole = 'IN' | 'OUT' | 'DUPLICATE' | 'MIDDLE' | 'OUTSIDE' | 'NOT_USED';

export type DailyShiftDetail = DailyShift & {
  breakStart: string | null;
  breakEnd: string | null;
  lateToleranceMinutes: number;
  earlyToleranceMinutes: number;
  roundingMode: 'NONE' | 'UP' | 'DOWN' | 'NEAREST';
  roundingMinutes: number | null;
  windowFrom: string;
  windowTo: string;
};

export type PunchSource = { id: string; fileName: string | null; importedAt: string; importedBy: string | null };

/** The place found at the moment of a mobile punch; `active` is its state now. */
export type PunchPlace = { id: string; name: string; radiusMeters: number; active: boolean };

/** What the phone reported and the check-in found. The place and distance were found then and never change. */
export type MobilePunch = {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  location: PunchPlace | null;
  distanceMeters: number | null;
  outsideLocation: boolean;
  lowAccuracy: boolean;
};

/** `mobile` is null for a machine punch; the photo of a mobile one is at `/api/attendance/punches/{id}/photo`. */
export type PunchLine = { id: string; at: string; role: PunchRole; device: string | null; source: PunchSource | null; mobile: MobilePunch | null };

export type DailyDetail = {
  employee: EmployeeCard;
  orgUnitId: string | null;
  day: DailyDay;
  shift: DailyShiftDetail | null;
  punches: PunchLine[];
  manualEntry: ManualEntry | null;
  coveredUntil: string | null;
};

/** The Công thủ công of a day as the timekeeper entered it; `in` and `out` are "HH:mm", for TIMES only. */
export type ManualEntry = { kind: ManualKind; in: string | null; out: string | null; note: string | null; enteredBy: string | null; enteredAt: string };

/** One day with its rules and raw punches; asked when a day is opened. */
export function useDailyDetail(target: { employeeId: string; date: string } | null) {
  return useQuery({
    queryKey: [...ATTENDANCE_DAILY_KEY, 'day', target],
    queryFn: () => api<DailyDetail>(`/api/attendance/daily/${target!.employeeId}/${target!.date}`),
    enabled: target !== null,
    retry: false,
  });
}
