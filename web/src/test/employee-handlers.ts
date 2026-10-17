// MSW handlers for the employee list ("## API contract" on issue #8) over the fixture Employees, as the backend
// applies the query: `q` on name or code without accents, a unit with or without its child units, a position,
// comma-separated statuses (empty: current), or ALL; `sort` (code, fullName or hireDate, with ,asc or ,desc), `page` and `size`.
import { delay, http, HttpResponse } from 'msw';
import type { EmployeeListItem } from '@/features/employee/api';
import { problem } from './auth-handlers';
import { EMPLOYEES } from './employee-fixtures';
import { orgStructure } from './org-unit-fixtures';

/** Lower case, without Vietnamese accents, as the backend's SearchText. */
const plain = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, 'd').toLowerCase();

/** The unit and every unit below it, in the fixture tree. */
function subtree(id: string): Set<string> {
  const { units } = orgStructure();
  const ids = new Set([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const unit of units) {
      if (unit.parentId && ids.has(unit.parentId) && !ids.has(unit.id)) {
        ids.add(unit.id);
        grew = true;
      }
    }
  }
  return ids;
}

const ORDER: Record<string, (a: EmployeeListItem, b: EmployeeListItem) => number> = {
  code: (a, b) => a.code.localeCompare(b.code),
  fullName: (a, b) => plain(a.fullName).localeCompare(plain(b.fullName)),
  hireDate: (a, b) => a.hireDate.localeCompare(b.hireDate),
};

export type EmployeeListApi = {
  handler: ReturnType<typeof http.get>;
  /** The query string of every list request, in order, e.g. "page=0&size=20&status=PROBATION%2COFFICIAL". */
  requests: string[];
};

export function employeeListApi(source: EmployeeListItem[] = EMPLOYEES, { delayMs = 0 }: { delayMs?: number } = {}): EmployeeListApi {
  const requests: string[] = [];
  const handler = http.get('*/api/employees', async ({ request }) => {
    const search = new URL(request.url).searchParams;
    requests.push(search.toString());
    await delay(delayMs);
    const page = Number(search.get('page') ?? 0);
    const size = Number(search.get('size') ?? 20);
    const q = plain(search.get('q') ?? '').trim();
    const orgUnitId = search.get('orgUnitId');
    const units = orgUnitId ? (search.get('includeSubUnits') === 'false' ? new Set([orgUnitId]) : subtree(orgUnitId)) : null;
    const positionId = search.get('positionId');
    const statuses = (search.get('status') ?? 'PROBATION,OFFICIAL').split(',').filter(Boolean);
    const [key = 'code', direction = 'asc'] = (search.get('sort') ?? 'code').split(',');
    const order = ORDER[key];
    if (page < 0 || size < 1 || size > 100 || q.length > 100 || !order) return problem(400, 'validation.invalid');
    const matching = source
      .filter(
        (employee) =>
          (!q || plain(employee.fullName).includes(q) || plain(employee.code).includes(q)) &&
          (!units || (employee.orgUnit !== null && units.has(employee.orgUnit.id))) &&
          (!positionId || employee.position?.id === positionId) &&
          (statuses.includes('ALL') || statuses.includes(employee.status)),
      )
      .sort((a, b) => (direction === 'desc' ? -order(a, b) : order(a, b)) || ORDER.code!(a, b));
    return HttpResponse.json({ items: matching.slice(page * size, (page + 1) * size), total: matching.length });
  });
  return { handler, requests };
}

export const employeesDenied = () => http.get('*/api/employees', () => problem(403, 'auth.forbidden'));
export const employeesFail = () => http.get('*/api/employees', () => problem(500, 'error.unknown'));
