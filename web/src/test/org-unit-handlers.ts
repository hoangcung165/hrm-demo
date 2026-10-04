// MSW handlers for the org structure API ("## API contract" on issue #5).
import { delay, http, HttpResponse } from 'msw';
import type { OrgStructure, OrgUnit } from '@/features/org-unit/api';
import { problem } from './auth-handlers';
import { orgStructure } from './org-unit-fixtures';

export const orgUnitsOk = (structure: OrgStructure = orgStructure()) => http.get('*/api/org-units', () => HttpResponse.json(structure));
export const orgUnitsDenied = () => http.get('*/api/org-units', () => problem(403, 'auth.forbidden'));
export const orgUnitsFail = () => http.get('*/api/org-units', () => problem(500, 'error.unknown'));

export type OrgUnitApi = {
  handlers: ReturnType<typeof http.get>[];
  /** Bodies of the POST and PUT calls, in order; a move is the POST that has an `id`. */
  writes: { method: 'POST' | 'PUT'; id?: string; body: Record<string, unknown> }[];
  current: () => OrgStructure;
};

/** GET, POST, PUT and move over one in-memory copy of the structure, validating like the backend does. */
export function orgUnitApi(initial: OrgStructure = orgStructure(), { delayMs = 0 }: { delayMs?: number } = {}): OrgUnitApi {
  const structure: OrgStructure = structuredClone(initial);
  const writes: OrgUnitApi['writes'] = [];
  const active = () => structure.units.filter((unit) => unit.active).length;

  // The normalised text of a request, or the problem the backend would answer with.
  const check = (body: Record<string, unknown>, selfId?: string) => {
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : null;
    const errors = [];
    if (!name) errors.push({ field: 'name', code: 'NotBlank' });
    else if (name.length > 150) errors.push({ field: 'name', code: 'Size' });
    if (code === null) errors.push({ field: 'code', code: 'NotNull' });
    else if (!/^[A-Z0-9-]{2,10}$/.test(code)) errors.push({ field: 'code', code: 'Pattern' });
    if (!['BRANCH', 'DEPARTMENT', 'TEAM'].includes(body.type as string)) errors.push({ field: 'type', code: body.type == null ? 'NotNull' : 'Pattern' });
    if (errors.length > 0) return { problem: problem(400, 'validation.invalid', { errors }) };
    if (body.headEmployeeId != null) return { problem: problem(400, 'org_unit.head_not_found') };
    const holder = structure.units.find((unit) => unit.code === code && unit.id !== selfId);
    if (holder) return { problem: problem(409, 'org_unit.code_taken', { holder: { id: holder.id, code: holder.code, name: holder.name } }) };
    return { name, code: code!, type: body.type as OrgUnit['type'] };
  };

  const handlers = [
    http.get('*/api/org-units', () => HttpResponse.json(structure)),
    http.post('*/api/org-units', async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      writes.push({ method: 'POST', body });
      await delay(delayMs);
      const checked = check(body);
      if (checked.problem) return checked.problem;
      const parentId = (body.parentId as string | null | undefined) ?? null;
      const parent = structure.units.find((unit) => unit.id === parentId);
      if (parentId && !parent) return problem(400, 'org_unit.parent_not_found');
      if (parent && !parent.active) return problem(409, 'org_unit.parent_inactive');
      const siblings = structure.units.filter((unit) => unit.parentId === parentId);
      const unit: OrgUnit = {
        id: `00000000-0000-4000-9000-${String(structure.units.length + 1).padStart(12, '0')}`,
        name: checked.name,
        code: checked.code,
        type: checked.type,
        parentId,
        active: true,
        head: null,
        headcountDirect: 0,
        headcountTotal: 0,
        childCount: 0,
        sortOrder: siblings.length + 1,
      };
      structure.units.push(unit);
      (parent ?? structure.root).childCount += 1;
      structure.summary.activeUnitCount = active();
      return HttpResponse.json(unit, { status: 201 });
    }),
    http.put('*/api/org-units/:id', async ({ request, params }) => {
      const body = (await request.json()) as Record<string, unknown>;
      const id = String(params.id);
      writes.push({ method: 'PUT', id, body });
      await delay(delayMs);
      const unit = structure.units.find((candidate) => candidate.id === id);
      if (!unit) return problem(404, 'org_unit.not_found');
      const checked = check({ ...body, headEmployeeId: null }, id);
      if (checked.problem) return checked.problem;
      Object.assign(unit, { name: checked.name, code: checked.code, type: checked.type });
      return HttpResponse.json(unit);
    }),
    http.post('*/api/org-units/:id/move', async ({ request, params }) => {
      const body = (await request.json()) as { parentId?: string | null };
      const id = String(params.id);
      writes.push({ method: 'POST', id, body });
      await delay(delayMs);
      const find = (unitId: string | null) => structure.units.find((candidate) => candidate.id === unitId);
      const unit = find(id);
      if (!unit) return problem(404, 'org_unit.not_found');
      const parentId = body.parentId ?? null;
      const parent = find(parentId);
      if (parentId && !parent) return problem(400, 'org_unit.parent_not_found');
      // The unit and everything above a unit, nearest first.
      const chain = (from: OrgUnit | undefined): OrgUnit[] => (from ? [from, ...chain(find(from.parentId))] : []);
      if (chain(parent).includes(unit)) return problem(409, 'org_unit.move_into_self_or_descendant');
      if (parent && !parent.active) return problem(409, 'org_unit.parent_inactive');
      const oldParent = find(unit.parentId);
      for (const above of chain(oldParent)) above.headcountTotal -= unit.headcountTotal;
      for (const above of chain(parent)) above.headcountTotal += unit.headcountTotal;
      (oldParent ?? structure.root).childCount -= 1;
      (parent ?? structure.root).childCount += 1;
      unit.sortOrder = structure.units.filter((candidate) => candidate.parentId === parentId && candidate !== unit).length + 1;
      unit.parentId = parentId;
      // Last among its new siblings, and still parents before children: the unit and what is below it go to the end.
      const below = (candidate: OrgUnit) => chain(candidate).includes(unit);
      structure.units = [...structure.units.filter((candidate) => !below(candidate)), ...structure.units.filter(below)];
      return HttpResponse.json(unit);
    }),
  ];
  return { handlers, writes, current: () => structure };
}
