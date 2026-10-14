// MSW handler for the resource heatmap ("## API contract" on issues #205 and #206) over fixture people, as the backend
// applies the query: `q` on name and code without accents, `orgUnitId`, `level` by the default thresholds on the highest
// load of the columns, `sort`, `page` and `size`; columns from `from` (any day of the first column), `granularity`
// and `columns`.
import { addDays, addMonths, addWeeks, differenceInCalendarWeeks, endOfMonth, format, parseISO, startOfMonth, startOfWeek } from 'date-fns';
import { delay, http, HttpResponse } from 'msw';
import type { CellAllocation, CellDetail, Heatmap, HeatmapRow } from '@/features/resource/api';
import type { AllocationBrief } from '@/features/resource/list-api';
import type { ResourceSettings } from '@/features/resource/settings-api';
import type { Overview, OverviewLevels, OverviewWeek } from '@/features/resource/overview-api';
import { heatLevel } from '@/components/ui/heat-cell';
import { problem } from './auth-handlers';
import { unitId } from './org-unit-fixtures';
import { companyToday } from '@/lib/company-time';

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

export function heatmapApi(source: FixturePerson[] = HEATMAP_PEOPLE, { delayMs = 0, today = companyToday() }: { delayMs?: number; today?: Date } = {}): HeatmapApi {
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
export function cellDetailFor(employeeId: string, from: string, to: string, today = companyToday()): CellDetail {
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

// The Bench and Sắp hết dự án lists ("## API contract" on issue #206) over the same people: the bench is everyone whose
// highest load in the period is under 50% (lowest first); the ending list is three allocations ending within 4 weeks.
const brief = (code: string, name: string, percent: number, startDate: string, endDate: string): AllocationBrief => ({
  id: `b-${code}-${percent}`,
  projectId: `p-${code}`,
  projectCode: code,
  projectName: name,
  projectRole: { id: 'role-dev', code: 'DEV', name: 'Lập trình viên', active: true },
  percent,
  startDate,
  endDate,
});

const THRESHOLDS = { benchPercent: 50, nearFullPercent: 90, endingWeeks: 4 };
const card = (p: FixturePerson) => ({ id: p.id, code: p.code, fullName: p.fullName, orgUnitName: p.orgUnitName });
const inUnit = (p: FixturePerson, unit: string | null) => !unit || (p.unitCode !== null && unitId(p.unitCode) === unit);
const paged = <T>(rows: T[], search: URLSearchParams) => {
  const page = Number(search.get('page') ?? 0);
  const size = Number(search.get('size') ?? 50);
  return { page, size, items: rows.slice(page * size, page * size + size) };
};


/** Three allocations ending within 4 weeks: Cao Minh Trí today (next one starts in 3 days), Phan Khánh Duy in 5 days (nothing next), Trần Thị Mai in 20 days (50% elsewhere). */
const endingFixture = (today: Date) => {
  const [tri, duy, mai] = [HEATMAP_PEOPLE[0]!, HEATMAP_PEOPLE[2]!, HEATMAP_PEOPLE[1]!];
  return [
    { employee: card(tri), allocation: brief('DA-031', 'Ứng dụng đặt lịch khám', 60, iso(addWeeks(today, -10)), iso(today)), daysLeft: 0, loadAfter: 60, next: brief('DA-040', 'Cổng đối tác', 60, iso(addDays(today, 3)), iso(addWeeks(today, 20))), withoutNext: false },
    { employee: card(duy), allocation: brief('DA-027', 'Hệ thống bán hàng tại quầy', 30, iso(addWeeks(today, -10)), iso(addDays(today, 5))), daysLeft: 5, loadAfter: 0, next: null, withoutNext: true },
    { employee: card(mai), allocation: brief('DA-029', 'Cổng khách hàng bảo hiểm', 50, iso(addWeeks(today, -10)), iso(addDays(today, 20))), daysLeft: 20, loadAfter: 50, next: null, withoutNext: false },
  ];
};


const levelCounts = (loads: number[]): OverviewLevels => {
  const counts = { bench: 0, partial: 0, full: 0, over: 0 };
  for (const load of loads) counts[heatLevel(load)] += 1;
  return counts;
};

/** The overview of the fixture people (week index 0 is this week): the project block is fixed, the rest follows the department. */
export function overviewFor(unit: string | null, today = companyToday()): Overview {
  const people = HEATMAP_PEOPLE.filter((p) => inUnit(p, unit));
  const first = startOfWeek(today, { weekStartsOn: 1 });
  const weeks: OverviewWeek[] = Array.from({ length: 12 }, (_, i) => ({ from: iso(addWeeks(first, i)), to: iso(addDays(addWeeks(first, i), 6)), levels: levelCounts(people.map((p) => p.weeks[i]!)) }));
  const loads = people.map((p) => p.weeks[0]!);
  const ending = endingFixture(today).filter((r) => people.some((p) => p.id === r.employee.id));
  return {
    weekFrom: iso(first),
    weekTo: iso(addDays(first, 6)),
    tiles: {
      projectsRunning: 3,
      projectsPlanned: 1,
      projectsOnHold: 1,
      projectStaff: people.length === 0 ? 0 : 4,
      people: people.length,
      averageLoad: people.length === 0 ? null : Math.round(loads.reduce((sum, load) => sum + load, 0) / people.length),
      bench: levelCounts(loads).bench,
      overloadedNow: levelCounts(loads).over,
      overloadedIn12Weeks: people.filter((p) => Math.max(...p.weeks) > 100).length,
      endingSoon: ending.length,
    },
    thisWeek: levelCounts(loads),
    weeks,
    projects: [
      { projectId: 'p-DA-027', code: 'DA-027', name: 'Hệ thống bán hàng tại quầy', headcount: 4, fte: 2.4, overloaded: 1, upcoming: 0 },
      { projectId: 'p-DA-031', code: 'DA-031', name: 'Ứng dụng đặt lịch khám', headcount: 2, fte: 1.2, overloaded: 0, upcoming: 1 },
    ],
    attention: {
      overloaded: people.filter((p) => Math.max(...p.weeks) > 100).map((p) => ({ employee: card(p), peak: Math.max(...p.weeks), from: iso(addWeeks(first, 1)), to: iso(addDays(addWeeks(first, 3), 6)), projects: ['DA-029', 'DA-031'] })),
      ending: ending.map((r) => ({ employee: r.employee, allocation: r.allocation, daysLeft: r.daysLeft, loadAfter: r.loadAfter, withoutNext: r.withoutNext })),
    },
    thresholds: THRESHOLDS,
  };
}

export type ResourceListsApi = { handlers: Array<ReturnType<typeof http.get>>; /** The query string of every overview request. */ overview: string[]; /** The query string of every bench request. */ bench: string[]; /** The query string of every ending request. */ ending: string[] };

export function resourceListsApi({ today = companyToday() }: { today?: Date } = {}): ResourceListsApi {
  const bench: string[] = [];
  const ending: string[] = [];
  const overview: string[] = [];
  const benchHandler = http.get('*/api/resources/bench', ({ request }) => {
    const search = new URL(request.url).searchParams;
    bench.push(search.toString());
    const weekly = search.get('granularity') !== 'MONTH';
    const day = search.get('from') ? parseISO(search.get('from')!) : today;
    const first = weekly ? startOfWeek(day, { weekStartsOn: 1 }) : startOfMonth(day);
    const last = weekly ? addDays(first, 6) : endOfMonth(first);
    const index = differenceInCalendarWeeks(first, startOfWeek(today, { weekStartsOn: 1 }), { weekStartsOn: 1 });
    const span = weekly ? 1 : 4;
    const peakOf = (p: FixturePerson) => Math.max(0, ...p.weeks.slice(Math.max(0, index), Math.max(0, index) + span));
    const rows = HEATMAP_PEOPLE.filter((p) => inUnit(p, search.get('orgUnitId')) && peakOf(p) < THRESHOLDS.benchPercent)
      .map((p) => ({
        employee: card(p),
        peak: peakOf(p),
        nextAllocation: p.id === personId(3) ? brief('DA-033', 'Nền tảng dữ liệu nội bộ', 30, iso(addWeeks(today, 10)), iso(addWeeks(today, 30))) : null,
        latestProject: p.id === personId(3) ? brief('DA-027', 'Hệ thống bán hàng tại quầy', 30, iso(addWeeks(today, -20)), iso(addWeeks(today, 5))) : null,
      }))
      .sort((a, b) => a.peak - b.peak || a.employee.fullName.localeCompare(b.employee.fullName, 'vi'));
    return HttpResponse.json({
      from: iso(first),
      to: iso(last),
      granularity: weekly ? 'WEEK' : 'MONTH',
      total: rows.length,
      ...paged(rows, search),
      summary: { noAllocation: rows.filter((r) => r.peak === 0).length, belowThreshold: rows.filter((r) => r.peak > 0).length },
      thresholds: THRESHOLDS,
    });
  });
  const endingHandler = http.get('*/api/resources/ending', ({ request }) => {
    const search = new URL(request.url).searchParams;
    ending.push(search.toString());
    const all = endingFixture(today).filter((r) => inUnit(HEATMAP_PEOPLE.find((p) => p.id === r.employee.id)!, search.get('orgUnitId')));
    const rows = search.get('onlyWithoutNext') === 'true' ? all.filter((r) => r.withoutNext) : all;
    return HttpResponse.json({ weeks: 4, total: rows.length, ...paged(rows, search), summary: { endingSoon: all.length, withoutNext: all.filter((r) => r.withoutNext).length }, items: paged(rows, search).items });
  });
  const overviewHandler = http.get('*/api/resources/overview', ({ request }) => {
    const search = new URL(request.url).searchParams;
    overview.push(search.toString());
    return HttpResponse.json(overviewFor(search.get('orgUnitId'), today));
  });
  return { handlers: [benchHandler, endingHandler, overviewHandler], overview, bench, ending };
}

export const benchDenied = () => http.get('*/api/resources/bench', () => problem(403, 'auth.forbidden'));
export const benchFail = () => http.get('*/api/resources/bench', () => problem(500, 'error.unknown'));
export const endingFail = () => http.get('*/api/resources/ending', () => problem(500, 'error.unknown'));

export const overviewDenied = () => http.get('*/api/resources/overview', () => problem(403, 'auth.forbidden'));
export const overviewFail = () => http.get('*/api/resources/overview', () => problem(500, 'error.unknown'));

type SettingsBody = { benchPercent?: number | null; nearFullPercent?: number | null; endingWeeks?: number | null };

/** The failing fields of a save, as the backend's `ResourceThresholds.check` reports them. */
const settingsErrors = ({ benchPercent: bench, nearFullPercent: nearFull, endingWeeks: weeks }: SettingsBody) => {
  const errors: Array<{ field: string; code: string }> = [];
  const range = (field: string, value: number | null | undefined, min: number, max: number) => {
    if (value == null) errors.push({ field, code: 'required' });
    else if (value < min || value > max) errors.push({ field, code: 'out_of_range' });
    else return true;
    return false;
  };
  const benchOk = range('benchPercent', bench, 1, 99);
  const nearFullOk = range('nearFullPercent', nearFull, 2, 100);
  range('endingWeeks', weeks, 1, 12);
  if (benchOk && nearFullOk && bench! >= nearFull!) errors.push({ field: 'benchPercent', code: 'not_below_near_full' });
  return errors;
};

export type SettingsApi = {
  handlers: Array<ReturnType<typeof http.get> | ReturnType<typeof http.put>>;
  /** The body of every save, in order. */
  saves: SettingsBody[];
};

/** `GET` and `PUT /api/resource-settings` over a thresholds state that starts at `start` (the defaults), as the backend validates and stores it. */
export function settingsApi(start: Partial<ResourceSettings> = {}): SettingsApi {
  let state: ResourceSettings = { benchPercent: 50, nearFullPercent: 90, endingWeeks: 4, customized: false, updatedAt: null, updatedByName: null, canEdit: true, ...start };
  const saves: SettingsBody[] = [];
  return {
    saves,
    handlers: [
      http.get('*/api/resource-settings', () => HttpResponse.json(state)),
      http.put('*/api/resource-settings', async ({ request }) => {
        const body = (await request.json()) as SettingsBody;
        saves.push(body);
        const errors = settingsErrors(body);
        if (errors.length > 0) return problem(400, 'validation.invalid', { errors });
        const isDefault = body.benchPercent === 50 && body.nearFullPercent === 90 && body.endingWeeks === 4;
        state = { ...state, benchPercent: body.benchPercent!, nearFullPercent: body.nearFullPercent!, endingWeeks: body.endingWeeks!, customized: !isDefault, updatedAt: isDefault ? null : '2026-10-15T03:30:00Z', updatedByName: isDefault ? null : 'Phạm Quốc Bảo' };
        return HttpResponse.json(state);
      }),
    ],
  };
}

export const settingsDenied = () => http.put('*/api/resource-settings', () => problem(403, 'auth.forbidden'));
export const settingsLoadFail = () => http.get('*/api/resource-settings', () => problem(500, 'error.unknown'));
