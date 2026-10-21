// MSW handlers for the Lịch phân ca (BE-3 of HRM-22: `GET /api/shift-calendar`), over a few fictional people whose shifts follow
// a rule by weekday, so any range has an answer: the same cells the backend would return for that range, filtered by
// person and shift, paged by name.
import { addDays, format, getDay, parseISO } from 'date-fns';
import { http, HttpResponse, type HttpHandler } from 'msw';
import type { EmployeeCard } from '@/features/approval/api';
import type { CalendarCell, CalendarDay, CalendarRow, CalendarShift, ShiftCalendar } from '@/features/shift/calendar-api';
import { problem } from './auth-handlers';
import { CA_DEM, CA_SANG, HANH_CHINH } from './shift-fixtures';

const brief = (shift: typeof HANH_CHINH): CalendarShift => ({ id: shift.id, code: shift.code, name: shift.name, startTime: shift.startTime, endTime: shift.endTime, crossesMidnight: shift.crossesMidnight, active: shift.active });
export const SHIFT_BRIEFS = [brief(HANH_CHINH), brief(CA_SANG), brief(CA_DEM)];

const card = (n: number, fullName: string, orgUnitName: string): EmployeeCard => ({ id: `00000000-0000-4000-e000-${String(n).padStart(12, '0')}`, code: `NV${String(n).padStart(5, '0')}`, fullName, orgUnitName });
export const AN = card(21, 'Nguyễn Văn An', 'Nhóm Web');
export const HUNG = card(22, 'Lê Văn Hùng', 'Nhóm Web');
export const TRI = card(31, 'Cao Minh Trí', 'Nhóm Vận hành');
export const LAN = card(13, 'Vũ Thị Lan', 'Phòng Phát triển phần mềm');
export const PEOPLE = [TRI, AN, HUNG, LAN];

/** A rule per person: An works the default Hành chính on weekdays, Hùng is assigned Ca sáng on weekdays, Trí is assigned Ca đêm Monday to Wednesday, Lan has no shift. */
function cellFor(person: EmployeeCard, date: string): CalendarCell | null {
  const weekday = getDay(parseISO(date));
  if (person.id === AN.id && weekday >= 1 && weekday <= 5) return { date, shiftId: HANH_CHINH.id, source: 'DEFAULT' };
  if (person.id === HUNG.id && weekday >= 1 && weekday <= 5) return { date, shiftId: CA_SANG.id, source: 'ASSIGNED' };
  if (person.id === TRI.id && weekday >= 1 && weekday <= 3) return { date, shiftId: CA_DEM.id, source: 'ASSIGNED' };
  return null;
}

export type ShiftCalendarApi = {
  handlers: HttpHandler[];
  /** The query string of every request, in order. */
  requests: URLSearchParams[];
};

export type ShiftCalendarOptions = {
  /** More people after the four, named "Người 01"…, for paging. */
  extraPeople?: number;
  /** Holidays by date. */
  holidays?: Record<string, string>;
  /** Answer every request with this problem. */
  fail?: { status: number; code: string };
};

export function shiftCalendarApi({ extraPeople = 0, holidays = {}, fail }: ShiftCalendarOptions = {}): ShiftCalendarApi {
  const requests: URLSearchParams[] = [];
  const everyone = [...PEOPLE, ...Array.from({ length: extraPeople }, (_, i) => card(100 + i, `Người ${String(i + 1).padStart(2, '0')}`, 'Nhóm Web'))];
  const handler = http.get('*/api/shift-calendar', ({ request }) => {
    const search = new URL(request.url).searchParams;
    requests.push(search);
    if (fail) return problem(fail.status, fail.code);
    const from = search.get('from')!;
    const to = search.get('to')!;
    const page = Number(search.get('page') ?? 0);
    const size = Number(search.get('size') ?? 50);
    const dates: string[] = [];
    for (let day = parseISO(from); format(day, 'yyyy-MM-dd') <= to; day = addDays(day, 1)) dates.push(format(day, 'yyyy-MM-dd'));
    const days: CalendarDay[] = dates.map((date) => ({ date, holiday: holidays[date] ?? null, dayKind: getDay(parseISO(date)) === 0 || getDay(parseISO(date)) === 6 ? 'OFF' : 'FULL' }));
    const employeeId = search.get('employeeId');
    const shiftId = search.get('shiftId');
    const rows: CalendarRow[] = everyone
      .filter((person) => !employeeId || person.id === employeeId)
      .map((person) => ({ employee: person, orgUnitId: null, cells: dates.map((date) => cellFor(person, date)).filter((cell): cell is CalendarCell => cell !== null && (!shiftId || cell.shiftId === shiftId)) }))
      .filter((row) => !shiftId || row.cells.length > 0)
      .sort((a, b) => a.employee.fullName.localeCompare(b.employee.fullName, 'vi'));
    const shown = rows.slice(page * size, (page + 1) * size);
    const used = new Set(shown.flatMap((row) => row.cells.map((cell) => cell.shiftId)));
    const body: ShiftCalendar = { from, to, days, shifts: SHIFT_BRIEFS.filter((shift) => used.has(shift.id)), rows: shown, total: rows.length, page, size };
    return HttpResponse.json(body);
  });
  return { handlers: [handler], requests };
}
