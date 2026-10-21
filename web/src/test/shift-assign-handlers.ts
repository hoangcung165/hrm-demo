// MSW handlers for assigning shifts (BE-2 of HRM-22): `PUT` and `DELETE /api/shift-assignments`, the default shift of a
// unit, and the list of the defaults. They record every write; the numbers they answer with are fixed by the test.
import { http, HttpResponse, type HttpHandler } from 'msw';
import type { AssignRequest, AssignResult, ClearRequest, ClearResult, UnitDefaultShift } from '@/features/shift/assign-api';
import { problem } from './auth-handlers';

export type ShiftAssignApi = {
  handlers: HttpHandler[];
  assigns: AssignRequest[];
  clears: ClearRequest[];
  /** The writes of the default shift: the unit and the shift (`null`: cleared). */
  defaultWrites: Array<{ orgUnitId: string; shiftId: string | null }>;
};

export type ShiftAssignOptions = {
  /** The units that have a default shift of their own. */
  defaults?: UnitDefaultShift[];
  /** The answer of a successful assignment. */
  result?: Partial<AssignResult>;
  /** The answer of a successful clear. */
  cleared?: ClearResult;
  /** Answer every write with this problem. */
  fail?: { status: number; code: string; extra?: Record<string, unknown> };
  /** Answer reading the defaults with this problem. */
  failDefaults?: boolean;
};

export function shiftAssignApi({ defaults = [], result = {}, cleared = { employees: 1, removed: 1 }, fail, failDefaults = false }: ShiftAssignOptions = {}): ShiftAssignApi {
  const assigns: AssignRequest[] = [];
  const clears: ClearRequest[] = [];
  const defaultWrites: ShiftAssignApi['defaultWrites'] = [];
  const held = defaults.map((entry) => ({ ...entry }));
  const handlers = [
    http.put('*/api/shift-assignments', async ({ request }) => {
      assigns.push((await request.json()) as AssignRequest);
      if (fail) return problem(fail.status, fail.code, fail.extra);
      const body: AssignResult = { employees: 2, days: [], created: 0, replaced: 0, unchanged: 0, skipped: [], ...result };
      return HttpResponse.json(body);
    }),
    http.delete('*/api/shift-assignments', async ({ request }) => {
      clears.push((await request.json()) as ClearRequest);
      if (fail) return problem(fail.status, fail.code, fail.extra);
      return HttpResponse.json(cleared);
    }),
    http.get('*/api/org-units/default-shifts', () => (failDefaults ? problem(500, 'internal') : HttpResponse.json(held))),
    http.put('*/api/org-units/:id/default-shift', async ({ request, params }) => {
      const { shiftId } = (await request.json()) as { shiftId: string | null };
      defaultWrites.push({ orgUnitId: params.id as string, shiftId });
      if (fail) return problem(fail.status, fail.code, fail.extra);
      const at = held.findIndex((entry) => entry.orgUnitId === params.id);
      if (shiftId === null && at >= 0) held.splice(at, 1);
      else if (shiftId !== null && at >= 0) held[at] = { orgUnitId: params.id as string, defaultShiftId: shiftId };
      else if (shiftId !== null) held.push({ orgUnitId: params.id as string, defaultShiftId: shiftId });
      return HttpResponse.json({ orgUnitId: params.id, defaultShiftId: shiftId });
    }),
  ];
  return { handlers, assigns, clears, defaultWrites };
}
