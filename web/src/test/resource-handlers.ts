// MSW handler for the resource heatmap ("## API contract" on issues #205 and #206) over fixture people, as the backend
// applies the query: `q` on name and code without accents, `orgUnitId`, `level` by the default thresholds on the highest
// load of the columns, `sort`, `page` and `size`; columns from `from` (any day of the first column), `granularity`
// and `columns`.
import { addDays, addMonths, addWeeks, differenceInCalendarWeeks, endOfMonth, format, parseISO, startOfMonth, startOfWeek } from 'date-fns';
import { delay, http, HttpResponse } from 'msw';
import type { CellAllocation, CellDetail, Heatmap, HeatmapRow } from '@/features/resource/api';
import { problem } from './auth-handlers';
import { unitId } from './org-unit-fixtures';

const plain = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, 'd').toLowerCase();
const iso = (day: Date) => format(day, 'yyyy-MM-dd');

export const personId = (n: number) => `00000000-0000-4000-b000-${String(900 + n).padStart(12, '0')}`;

/** A person of the fixtures: the load of each of the next 12 weeks (months take the same list). */
export type FixturePerson = { id: string; code: string; fullName: string; orgUnitName: string | null; unitCode: string | null; weeks: number[] };

const flat = (percent: number) => Array.from({ length: 12 }, () => percent);

/** The people of the approved #17 artboards: Cao Minh Trí is at 120% in weeks 1 to 3. */
export const HEATMAP_PEOPLE: FixturePerson[] = [
  { id: personId(1), code: 'NV00031', fullName: 'Cao Minh Trí', orgUnitName: 'Phòng Phát triển phần mềm', unitCode: 'PTPM', weeks: [60, 120, 120, 120, 60, 60, 60, 60, 60, 60, 60, 60] },
  { id: personId(2), code: 'NV00044', fullName: 'Trần Thị Mai', orgUnitName: 'Phòng Dịch vụ khách hàng', unitCode: 'DVKH', weeks: [50, 50, 50, 50, 50, 50, 90, 90, 90, 90, 90, 90] },
  { id: personId(3), code: 'NV00052', fullName: 'Phan Khánh Duy', orgUnitName: 'Phòng Phát triển phần mềm', unitCode: 'PTPM', weeks: [30, 30, 30, 30, 30, 0, 0, 0, 0, 0, 0, 0] },
  { id: personId(4), code: 'NV00017', fullName: 'Nguyễn Văn An', orgUnitName: null, unitCode: null, weeks: flat(0) },
  { id: personId(5), code: 'NV00065', fullName: 'Vũ Thị Lan', orgUnitName: 'Phòng Phát triển phần mềm', unitCode: 'PTPM', weeks: flat(100) },
];

export type HeatmapApi = {
  handler: ReturnType<typeof http.get>;
  /** The query string of every request, in order. */
  requests: string[];
};

const levelOf = (peak: number) => (peak > 100 ? 'OVER' : peak >= 90 ? 'FULL' : peak < 50 ? 'BENCH' : 'PARTIAL');

export function heatmapApi(source: FixturePerson[] = HEATMAP_PEOPLE, { delayMs = 0, today = new Date() }: { delayMs?: number; today?: Date } = {}): HeatmapApi {
  const requests: string[] = [];
  const handler = http.get('*/api/resources/heatmap', async ({ request }) => {
    const search = new URL(request.url).searchParams;
    requests.push(search.toString());
    await delay(delayMs);
    const page = Number(search.get('page') ?? 0);
    const size = Number(search.get('size') ?? 50);
    const count = Number(search.get('columns') ?? 12);
    if (page < 0 || size < 1 || size > 200 || count < 1 || count > 12) return problem(400, 'validation.invalid');
    const weekly = search.get('granularity') !== 'MONTH';
    const day = search.get('from') ? parseISO(search.get('from')!) : today;
    const first = weekly ? startOfWeek(day, { weekStartsOn: 1 }) : startOfMonth(day);
    const columns = Array.from({ length: count }, (_, i) => {
      const from = weekly ? addWeeks(first, i) : addMonths(first, i);
      return { from: iso(from), to: iso(weekly ? addDays(from, 6) : endOfMonth(from)) };
    });

    const q = plain(search.get('q') ?? '').trim();
    const unit = search.get('orgUnitId');
    const people = source.filter((p) => (!q || plain(`${p.fullName} ${p.code}`).includes(q)) && (!unit || (p.unitCode !== null && unitId(p.unitCode) === unit)));
    const rows: Array<HeatmapRow> = people.map((p) => {
      const cells = p.weeks.slice(0, count);
      return { employee: { id: p.id, code: p.code, fullName: p.fullName, orgUnitName: p.orgUnitName }, cells, peak: Math.max(0, ...cells) };
    });
    const sort = search.get('sort') ?? 'LOAD_DESC';
    const byName = (a: HeatmapRow, b: HeatmapRow) => a.employee.fullName.localeCompare(b.employee.fullName, 'vi');
    const shown = rows
      .filter((r) => !search.get('level') || levelOf(r.peak) === search.get('level'))
      .sort(sort === 'NAME' ? byName : sort === 'LOAD_ASC' ? (a, b) => a.peak - b.peak || byName(a, b) : (a, b) => b.peak - a.peak || byName(a, b));
    const body: Heatmap = {
      from: columns[0]!.from,
      to: columns[columns.length - 1]!.to,
      granularity: weekly ? 'WEEK' : 'MONTH',
      columns,
      items: shown.slice(page * size, page * size + size),
      total: shown.length,
      page,
      size,
      summary: { people: people.length, overloadedNow: rows.filter((r) => r.cells[0]! > 100).length, overloadedInWindow: rows.filter((r) => r.peak > 100).length },
      thresholds: { benchPercent: 50, nearFullPercent: 90, endingWeeks: 4 },
    };
    return HttpResponse.json(body);
  });
  return { handler, requests };
}

export const heatmapDenied = () => http.get('*/api/resources/heatmap', () => problem(403, 'auth.forbidden'));
export const heatmapFail = () => http.get('*/api/resources/heatmap', () => problem(500, 'error.unknown'));

const allocation = (code: string, name: string, percent: number, from: string, to: string, status: CellAllocation['status'] = 'RUNNING'): CellAllocation => ({
  id: `a-${code}-${percent}`,
  projectId: `p-${code}`,
  projectCode: code,
  projectName: name,
  projectRole: { id: 'role-dev', code: 'DEV', name: 'Lập trình viên', active: true },
  percent,
  startDate: from,
  endDate: to,
  status,
});

/** What the backend answers for a cell of the fixture people: the load of that week split over their projects; a week with nothing is empty (Phan Khánh Duy's next allocation starts in ten weeks). */
export function cellDetailFor(employeeId: string, from: string, to: string, today = new Date()): CellDetail {
  const person = HEATMAP_PEOPLE.find((p) => p.id === employeeId)!;
  const employee = { id: person.id, code: person.code, fullName: person.fullName, orgUnitName: person.orgUnitName };
  const index = differenceInCalendarWeeks(parseISO(from), today, { weekStartsOn: 1 });
  const percent = person.weeks[index] ?? 0;
  const base = { employee, position: 'Lập trình viên', from, to, peak: percent, overloaded: percent > 100 };
  if (percent === 0) {
    const next = person.id === personId(3) ? allocation('DA-033', 'Nền tảng dữ liệu nội bộ', 30, iso(addWeeks(today, 10)), iso(addWeeks(today, 30)), 'UPCOMING') : null;
    return { ...base, periods: [], allocations: [], nextAllocation: next };
  }
  const parts =
    percent === 120
      ? [allocation('DA-029', 'Cổng khách hàng bảo hiểm', 60, iso(addWeeks(parseISO(from), -8)), to), allocation('DA-031', 'Ứng dụng đặt lịch khám', 60, from, iso(addWeeks(parseISO(from), 6)))]
      : [allocation('DA-027', 'Hệ thống bán hàng tại quầy', percent, iso(addWeeks(parseISO(from), -8)), iso(addWeeks(parseISO(from), 6)))];
  return {
    ...base,
    periods: [
      {
        from,
        to,
        totalPercent: percent,
        overloaded: percent > 100,
        parts: parts.map((a) => ({ projectId: a.projectId, projectCode: a.projectCode, projectName: a.projectName, percent: a.percent, thisProject: false })),
      },
    ],
    allocations: parts,
    nextAllocation: null,
  };
}

export type CellDetailApi = { handler: ReturnType<typeof http.get>; /** The query string of every request, in order. */ requests: string[] };

export function cellDetailApi(build: typeof cellDetailFor = cellDetailFor): CellDetailApi {
  const requests: string[] = [];
  const handler = http.get('*/api/resources/employees/:employeeId/load', ({ request, params }) => {
    const search = new URL(request.url).searchParams;
    requests.push(search.toString());
    return HttpResponse.json(build(String(params.employeeId), search.get('from')!, search.get('to')!));
  });
  return { handler, requests };
}

export const cellDetailFail = () => http.get('*/api/resources/employees/:employeeId/load', () => problem(500, 'error.unknown'));
