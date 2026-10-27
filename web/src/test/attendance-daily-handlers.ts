// MSW handlers for Công theo ngày (HRM-23/BE-2, BE-4): two people over 12–18/10/2026, one on the night shift with a
// duplicate punch and a missing day, one on the day shift with a late day, a missing Out and a leave day. They record
// the query of every list request.
import { http, HttpResponse } from 'msw';
import type { DailyAttendance, DailyDay, DailyDetail, DailyRow } from '@/features/attendance/daily-api';
import { problem } from './auth-handlers';

export const NIGHT = { id: '00000000-0000-4000-c000-000000000001', code: 'CD', name: 'Ca đêm', startTime: '22:00', endTime: '06:00', crossesMidnight: true, active: true };
export const OFFICE = { id: '00000000-0000-4000-c000-000000000002', code: 'HC', name: 'Hành chính', startTime: '08:00', endTime: '17:00', crossesMidnight: false, active: true };
const MANH = { id: '00000000-0000-4000-b000-000000000034', code: 'NV00034', fullName: 'Lưu Đức Mạnh', orgUnitName: 'Nhóm Nền tảng và DevOps' };
const TRI = { id: '00000000-0000-4000-b000-000000000031', code: 'NV00031', fullName: 'Cao Minh Trí', orgUnitName: 'Nhóm Web' };

const day = (date: string, shiftId: string | null, over: Partial<DailyDay> = {}): DailyDay => ({
  date, shiftId, in: null, out: null, workedMinutes: 0, lateMinutes: 0, earlyLeaveMinutes: 0, flags: [], holiday: null, leave: null, noLog: false, ...over,
});

const manh: DailyRow = {
  employee: MANH,
  orgUnitId: null,
  totals: { workedDays: 4, workedMinutes: 1900, lateDays: 1, earlyLeaveDays: 1, missingPunchDays: 0, absentDays: 1, leaveDays: 0 },
  days: [
    day('2026-10-13', NIGHT.id, { in: '2026-10-13T21:58:03+07:00', out: '2026-10-14T06:02:41+07:00', workedMinutes: 480, flags: ['DUPLICATE_PUNCH'] }),
    day('2026-10-14', NIGHT.id, { in: '2026-10-14T22:31:00+07:00', out: '2026-10-15T06:01:00+07:00', workedMinutes: 445, lateMinutes: 31 }),
    day('2026-10-15', NIGHT.id, { flags: ['ABSENT'] }),
  ],
};
const tri: DailyRow = {
  employee: TRI,
  orgUnitId: null,
  totals: { workedDays: 3, workedMinutes: 1400, lateDays: 1, earlyLeaveDays: 0, missingPunchDays: 1, absentDays: 0, leaveDays: 1 },
  days: [
    day('2026-10-13', OFFICE.id, { in: '2026-10-13T08:17:00+07:00', out: '2026-10-13T17:02:00+07:00', workedMinutes: 460, lateMinutes: 17 }),
    day('2026-10-14', OFFICE.id, { in: '2026-10-14T07:55:00+07:00', flags: ['MISSING_OUT'] }),
    day('2026-10-16', OFFICE.id, { flags: ['LEAVE'], leave: 'WHOLE' }),
    day('2026-10-19', OFFICE.id, { noLog: true }),
  ],
};

export function dailyData(over: Partial<DailyAttendance> = {}): DailyAttendance {
  return {
    from: '2026-10-12', to: '2026-10-18', coveredUntil: '2026-10-17T06:03:00+07:00', lastImportAt: '2026-10-21T08:42:00+07:00',
    shifts: [OFFICE, NIGHT], rows: [manh, tri], total: 12, page: 0, size: 10, ...over,
  };
}

export function dayDetail(): DailyDetail {
  return {
    employee: MANH, orgUnitId: null, day: manh.days[0]!, coveredUntil: '2026-10-17T06:03:00+07:00',
    shift: { ...NIGHT, breakStart: null, breakEnd: null, lateToleranceMinutes: 5, earlyToleranceMinutes: 5, roundingMode: 'DOWN', roundingMinutes: 5, windowFrom: '2026-10-13T19:00:00+07:00', windowTo: '2026-10-14T09:00:00+07:00' },
    punches: [
      { at: '2026-10-13T14:05:12+07:00', role: 'OUTSIDE', device: 'Cổng chính', source: null },
      { at: '2026-10-13T21:58:03+07:00', role: 'IN', device: 'Cổng chính', source: { id: 'i1', fileName: 'log-12-18-10.csv', importedAt: '2026-10-21T01:42:00Z', importedBy: 'Trần Thị Mai' } },
      { at: '2026-10-14T06:02:10+07:00', role: 'DUPLICATE', device: 'Cổng chính', source: null },
      { at: '2026-10-14T06:02:41+07:00', role: 'OUT', device: 'Cổng chính', source: null },
    ],
  };
}

type Failure = { status: number; code: string };
export type DailyApi = { handlers: Array<ReturnType<typeof http.get>>; queries: URLSearchParams[]; days: string[] };

export function dailyApi({ list = dailyData() as DailyAttendance | Failure }: { list?: DailyAttendance | Failure } = {}): DailyApi {
  const queries: URLSearchParams[] = [];
  const days: string[] = [];
  const handlers = [
    http.get('*/api/attendance/daily/:employeeId/:date', ({ params }) => {
      days.push(`${params.employeeId}/${params.date}`);
      return HttpResponse.json(dayDetail());
    }),
    http.get('*/api/attendance/daily', ({ request }) => {
      queries.push(new URL(request.url).searchParams);
      return 'status' in list ? problem(list.status, list.code) : HttpResponse.json(list);
    }),
  ];
  return { handlers, queries, days };
}
