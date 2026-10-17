// MSW handler for GET /api/leave-calendar (contract on issue #21) over a few people off in the month of the company's
// today: four on the 8th, two of them for a half day, one more on the 9th, and a holiday on the 14th.
// It answers like the API: the range must be given and at most 62 days, and `orgUnitId` / `projectId` keep the people
// who belong to that unit or project. The queries it was asked are recorded.
import { addDays, format, startOfMonth } from 'date-fns';
import { http, HttpResponse } from 'msw';
import type { LeaveCalendar, LeaveCalendarEntry } from '@/features/leave/calendar-api';
import { companyToday } from '@/lib/company-time';
import { HUNG } from './approval-fixtures';
import { problem } from './auth-handlers';
import { AN, ANNUAL, LAN, PERSONAL, SICK, TRI, refOf, requestId } from './leave-fixtures';

/** `yyyy-MM-dd` of the `n`th day of the company's current month. */
export const monthDay = (n: number) => format(addDays(startOfMonth(companyToday()), n - 1), 'yyyy-MM-dd');

const full = (date: string) => ({ date, morning: true, afternoon: true });

export const WEB_UNIT_ID = '00000000-0000-4000-8000-0000000000aa';
export const PROJECT_ID = '00000000-0000-4000-a000-000000000025';

/** Who is in the Web unit and on the project: An and Trí. */
const IN_UNIT_AND_PROJECT = new Set([AN.id, TRI.id]);

export const CALENDAR_ENTRIES: LeaveCalendarEntry[] = [
  { requestId: requestId(1), employee: AN, leaveType: refOf(ANNUAL), status: 'APPROVED', days: [full(monthDay(8)), full(monthDay(9))] },
  { requestId: requestId(2), employee: TRI, leaveType: refOf(SICK), status: 'PENDING', days: [{ date: monthDay(8), morning: true, afternoon: false }] },
  { requestId: requestId(3), employee: LAN, leaveType: refOf(ANNUAL), status: 'APPROVED', days: [{ date: monthDay(8), morning: false, afternoon: true }] },
  { requestId: requestId(4), employee: HUNG, leaveType: refOf(PERSONAL), status: 'APPROVED', days: [full(monthDay(8))] },
];

export const HOLIDAYS = [{ date: monthDay(14), name: 'Giỗ Tổ Hùng Vương' }];

export type LeaveCalendarOptions = {
  entries?: LeaveCalendarEntry[];
  /** The calendar answers 500. */
  fail?: boolean;
  /** The calendar answers 403. */
  deny?: boolean;
};

export type LeaveCalendarApi = { handler: ReturnType<typeof http.get>; queries: string[] };

export function leaveCalendarApi({ entries = CALENDAR_ENTRIES, fail = false, deny = false }: LeaveCalendarOptions = {}): LeaveCalendarApi {
  const queries: string[] = [];
  const handler = http.get('*/api/leave-calendar', ({ request }) => {
    const search = new URL(request.url).searchParams;
    queries.push(search.toString());
    if (deny) return problem(403, 'auth.forbidden');
    if (fail) return problem(500, 'internal');
    const from = search.get('from') ?? '';
    const to = search.get('to') ?? '';
    if (!from || !to) return problem(400, 'validation.invalid', { errors: [{ field: from ? 'to' : 'from', code: 'required' }] });
    const narrowed = search.get('orgUnitId') || search.get('projectId') ? entries.filter((entry) => IN_UNIT_AND_PROJECT.has(entry.employee.id)) : entries;
    const inRange = narrowed
      .map((entry) => ({ ...entry, days: entry.days.filter((day) => day.date >= from && day.date <= to) }))
      .filter((entry) => entry.days.length > 0);
    const body: LeaveCalendar = { from, to, holidays: HOLIDAYS.filter((holiday) => holiday.date >= from && holiday.date <= to), entries: inRange };
    return HttpResponse.json(body);
  });
  return { handler, queries };
}
