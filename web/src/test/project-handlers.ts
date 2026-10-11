// MSW handlers for the project list ("## API contract" on issue #17) over the fixture projects, as the backend applies
// the query: `q` on code, name and client without accents, `mine`, comma-separated `status` (empty: every status
// but CLOSED), `orgUnitId`, `overloaded`, newest start first, `page` and `size`.
import { delay, http, HttpResponse } from 'msw';
import type { ProjectListItem } from '@/features/project/api';
import { problem } from './auth-handlers';
import { LAN_EMPLOYEE_ID, PROJECTS } from './project-fixtures';

const plain = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, 'd').toLowerCase();

export type ProjectListApi = {
  handler: ReturnType<typeof http.get>;
  /** The query string of every list request with more than one row, in order. */
  requests: string[];
};

/** `me`: the Employee of the signed-in Account, for `mine`. */
export function projectListApi(source: ProjectListItem[] = PROJECTS, { me = LAN_EMPLOYEE_ID, delayMs = 0 }: { me?: string | null; delayMs?: number } = {}): ProjectListApi {
  const requests: string[] = [];
  const handler = http.get('*/api/projects', async ({ request }) => {
    const search = new URL(request.url).searchParams;
    const page = Number(search.get('page') ?? 0);
    const size = Number(search.get('size') ?? 20);
    if (size > 1) requests.push(search.toString());
    await delay(delayMs);
    const q = plain(search.get('q') ?? '').trim();
    const statuses = (search.get('status') ?? '').split(',').filter(Boolean);
    const allowed = statuses.length > 0 ? statuses : ['PLANNED', 'ACTIVE', 'ON_HOLD'];
    if (page < 0 || size < 1 || size > 100) return problem(400, 'validation.invalid');
    const matching = source
      .filter((p) => !q || plain(`${p.code} ${p.name} ${p.client ?? ''}`).includes(q))
      .filter((p) => allowed.includes(p.status))
      .filter((p) => search.get('mine') !== 'true' || (me !== null && p.pm?.id === me))
      .filter((p) => !search.get('orgUnitId') || p.orgUnit?.id === search.get('orgUnitId'))
      .filter((p) => search.get('overloaded') !== 'true' || p.members.overloaded > 0)
      .sort((a, b) => b.startDate.localeCompare(a.startDate) || a.code.localeCompare(b.code));
    return HttpResponse.json({ items: matching.slice(page * size, page * size + size), total: matching.length });
  });
  return { handler, requests };
}

export const projectsDenied = () => http.get('*/api/projects', () => problem(403, 'auth.forbidden'));
export const projectsFail = () => http.get('*/api/projects', () => problem(500, 'error.unknown'));
