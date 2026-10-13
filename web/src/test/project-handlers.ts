// MSW handlers for the project list ("## API contract" on issue #17) over the fixture projects, as the backend applies
// the query: `q` on code, name and client without accents, `mine`, comma-separated `status` (empty: every status
// but CLOSED), `orgUnitId`, `overloaded`, newest start first, `page` and `size`.
import { delay, http, HttpResponse } from 'msw';
import type { AllocationList, Project, ProjectListItem } from '@/features/project/api';
import { problem } from './auth-handlers';
import { LAN_EMPLOYEE_ID, PROJECTS, projectId } from './project-fixtures';

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

/** GET /api/projects/{id}: the given projects by id; any other id is 404. */
export const projectDetailOk = (projects: Project[]) =>
  http.get('*/api/projects/:id', ({ params }) => {
    const found = projects.find((p) => p.id === params.id);
    return found ? HttpResponse.json(found) : problem(404, 'project.not_found');
  });
export const projectDetailStatus = (status: number, code: string) => http.get('*/api/projects/:id', () => problem(status, code));

export type AllocationsApi = { handler: ReturnType<typeof http.get>; requests: string[] };

/** GET /api/projects/{id}/allocations?ended=: `current` or `ended`; `fail` answers 500. */
export function allocationsApi(current: AllocationList, ended: AllocationList, { fail = false }: { fail?: boolean } = {}): AllocationsApi {
  const requests: string[] = [];
  const handler = http.get('*/api/projects/:id/allocations', ({ request }) => {
    const search = new URL(request.url).searchParams;
    requests.push(search.toString());
    if (fail) return problem(500, 'error.unknown');
    return HttpResponse.json(search.get('ended') === 'true' ? ended : current);
  });
  return { handler, requests };
}

export type ProjectWriteApi = {
  handlers: Array<ReturnType<typeof http.post>>;
  /** The body of every POST and PUT, in order. */
  writes: Array<Record<string, unknown>>;
};

/**
 * POST /api/projects and PUT /api/projects/{id} over `projects`: a code already in `PROJECTS` is `project.code_taken`;
 * `failWith` answers that problem instead. The saved project is answered like the backend's `ProjectResponse`.
 */
export function projectWriteApi(projects: Project[], { failWith }: { failWith?: [number, string] } = {}): ProjectWriteApi {
  const writes: Array<Record<string, unknown>> = [];
  const saved = (base: Project, body: Record<string, unknown>): Project => ({
    ...base,
    ...(body as Partial<Project>),
    client: (body.client as string | null) ?? null,
    pm: base.pm && base.pm.id === body.pmEmployeeId ? base.pm : { id: String(body.pmEmployeeId), code: 'NV00099', fullName: 'Người được chọn', orgUnitName: null },
    orgUnit: { id: String(body.orgUnitId), name: 'Phòng ban', active: true },
  });
  const handlers = [
    http.post('*/api/projects', async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      writes.push(body);
      if (failWith) return problem(failWith[0], failWith[1]);
      if (PROJECTS.some((p) => p.code.toLowerCase() === String(body.code).toLowerCase())) return problem(409, 'project.code_taken');
      const base: Project = { ...projects[0]!, id: projectId(String(body.code)), canEdit: true, members: { running: 0, upcoming: 0, overloaded: 0 }, pm: null };
      return HttpResponse.json(saved(base, body), { status: 201 });
    }),
    http.put('*/api/projects/:id', async ({ request, params }) => {
      const body = (await request.json()) as Record<string, unknown>;
      writes.push(body);
      if (failWith) return problem(failWith[0], failWith[1]);
      const found = projects.find((p) => p.id === params.id);
      return found ? HttpResponse.json(saved(found, body)) : problem(404, 'project.not_found');
    }),
  ];
  return { handlers, writes };
}
