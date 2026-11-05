// MSW handlers for Công theo ngày (HRM-23/BE-2, BE-4): two people over 12–18/10/2026, one on the night shift with a
// duplicate punch and a missing day, one on the day shift with a late day, a missing Out and a leave day. They record
// the query of every list request.
import { http, HttpResponse } from 'msw';
import type { DailyAttendance, DailyDay, DailyDetail, DailyRow } from '@/features/attendance/daily-api';
import { problem } from './auth-handlers';
import { PHOTO_BYTES } from './mobile-checkin-handlers';

export const NIGHT = { id: '00000000-0000-4000-c000-000000000001', code: 'CD', name: 'Ca đêm', startTime: '22:00', endTime: '06:00', crossesMidnight: true, active: true };
export const OFFICE = { id: '00000000-0000-4000-c000-000000000002', code: 'HC', name: 'Hành chính', startTime: '08:00', endTime: '17:00', crossesMidnight: false, active: true };
const MANH = { id: '00000000-0000-4000-b000-000000000034', code: 'NV00034', fullName: 'Lưu Đức Mạnh', orgUnitName: 'Nhóm Nền tảng và DevOps' };
const TRI = { id: '00000000-0000-4000-b000-000000000031', code: 'NV00031', fullName: 'Cao Minh Trí', orgUnitName: 'Nhóm Web' };

const day = (date: string, shiftId: string | null, over: Partial<DailyDay> = {}): DailyDay => ({
  date, shiftId, in: null, out: null, workedMinutes: 0, lateMinutes: 0, earlyLeaveMinutes: 0, flags: [], holiday: null, leave: null, noLog: false, inSource: null, outSource: null, manual: null, inPunchSource: null, outPunchSource: null, ...over,
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
    employee: MANH, orgUnitId: null, day: manh.days[0]!, manualEntry: null, coveredUntil: '2026-10-17T06:03:00+07:00',
    shift: { ...NIGHT, breakStart: null, breakEnd: null, lateToleranceMinutes: 5, earlyToleranceMinutes: 5, roundingMode: 'DOWN', roundingMinutes: 5, windowFrom: '2026-10-13T19:00:00+07:00', windowTo: '2026-10-14T09:00:00+07:00' },
    punches: [
      { id: 'pu-1', at: '2026-10-13T14:05:12+07:00', role: 'OUTSIDE', device: 'Cổng chính', source: null, mobile: null },
      { id: 'pu-2', at: '2026-10-13T21:58:03+07:00', role: 'IN', device: 'Cổng chính', source: { id: 'i1', fileName: 'log-12-18-10.csv', importedAt: '2026-10-21T01:42:00Z', importedBy: 'Trần Thị Mai' }, mobile: null },
      { id: 'pu-3', at: '2026-10-14T06:02:10+07:00', role: 'DUPLICATE', device: 'Cổng chính', source: null, mobile: null },
      { id: 'pu-4', at: '2026-10-14T06:02:41+07:00', role: 'OUT', device: 'Cổng chính', source: null, mobile: null },
    ],
  };
}

const HOA_LAC = { id: '00000000-0000-4000-e000-000000000001', name: 'Trung tâm dữ liệu Hòa Lạc', radiusMeters: 200, active: true };

/** The example of the #39 artboards: In by phone at Hòa Lạc, 60 m from the centre; Out by phone 1,4 km away (Ngoài vùng). */
export function mobileDailyData(): DailyAttendance {
  const mobileDay = day('2026-10-13', NIGHT.id, {
    in: '2026-10-13T21:54:12+07:00', out: '2026-10-14T06:07:40+07:00', workedMinutes: 480, flags: ['OUTSIDE_LOCATION'], inPunchSource: 'MOBILE', outPunchSource: 'MOBILE',
  });
  return dailyData({ rows: [{ ...manh, days: [mobileDay, manh.days[1]!] }], total: 1 });
}

/** The drawer of that day; `lowAccuracy` makes the Out a poor reading too, `machine` leaves the In to a machine. */
export function mobileDayDetail({ lowAccuracy = false, placeActive = true }: { lowAccuracy?: boolean; placeActive?: boolean } = {}): DailyDetail {
  const base = dayDetail();
  const place = { ...HOA_LAC, active: placeActive };
  return {
    ...base,
    day: { ...mobileDailyData().rows[0]!.days[0]!, flags: lowAccuracy ? ['OUTSIDE_LOCATION', 'LOW_ACCURACY'] : ['OUTSIDE_LOCATION'] },
    punches: [
      { id: 'mp-in', at: '2026-10-13T21:54:12+07:00', role: 'IN', device: null, source: null,
        mobile: { latitude: 21.00954, longitude: 105.529, accuracyMeters: 14, location: place, distanceMeters: 60, outsideLocation: false, lowAccuracy: false } },
      { id: 'mp-out', at: '2026-10-14T06:07:40+07:00', role: 'OUT', device: null, source: null,
        mobile: { latitude: 21.02216, longitude: 105.529, accuracyMeters: lowAccuracy ? 180 : 22, location: place, distanceMeters: 1_400, outsideLocation: true, lowAccuracy } },
    ],
  };
}

type Failure = { status: number; code: string };
export type DailyApi = {
  handlers: Array<ReturnType<typeof http.get>>;
  queries: URLSearchParams[];
  days: string[];
  /** The ids of the punches whose photo was read: one entry per read, as the Audit log writes one record per read. */
  photoViews: string[];
};

export type DailyApiOptions = {
  list?: DailyAttendance | Failure;
  detail?: DailyDetail;
  /** The photo endpoint answers 404, as for a punch outside the caller's scope. */
  photoHidden?: boolean;
};

export function dailyApi({ list = dailyData() as DailyAttendance | Failure, detail = dayDetail(), photoHidden = false }: DailyApiOptions = {}): DailyApi {
  const queries: URLSearchParams[] = [];
  const days: string[] = [];
  const photoViews: string[] = [];
  const handlers = [
    http.get('*/api/attendance/punches/:id/photo', ({ params }) => {
      photoViews.push(String(params.id));
      if (photoHidden) return problem(404, 'attendance.photo_not_found');
      return new HttpResponse(PHOTO_BYTES, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'no-store' } });
    }),
    http.get('*/api/attendance/daily/:employeeId/:date', ({ params }) => {
      days.push(`${params.employeeId}/${params.date}`);
      return HttpResponse.json(detail);
    }),
    http.get('*/api/attendance/daily', ({ request }) => {
      queries.push(new URL(request.url).searchParams);
      return 'status' in list ? problem(list.status, list.code) : HttpResponse.json(list);
    }),
  ];
  return { handlers, queries, days, photoViews };
}
