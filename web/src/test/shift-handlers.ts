// MSW handlers for the shifts (BE-1 of HRM-22: `/api/shifts`), over a copy of the fixture shifts: list by earliest
// start with `?active=`, add and edit with the backend's field errors, and turn off and on.
import { delay, http, HttpResponse, type HttpHandler } from 'msw';
import type { Shift, ShiftRequest } from '@/features/shift/api';
import { shiftLength } from '@/features/shift/duration';
import { problem } from './auth-handlers';
import { SHIFTS } from './shift-fixtures';

export type ShiftWrite = { method: 'POST' | 'PUT' | 'deactivate' | 'reactivate'; id?: string; body?: ShiftRequest };

export type ShiftApi = {
  handlers: HttpHandler[];
  /** Every write, in order. */
  writes: ShiftWrite[];
  /** The shifts as the handlers hold them now (a copy of the fixture, changed by the writes). */
  shifts: Shift[];
};

const invalid = (errors: Array<{ field: string; code: string }>) => problem(400, 'validation.invalid', { errors });

/** The checks of `ShiftService`, as far as the form can break them; the client already stops most of these. */
function check(body: ShiftRequest, others: Shift[], adding: boolean) {
  const errors: Array<{ field: string; code: string }> = [];
  if (adding && others.some((shift) => shift.code.toLowerCase() === body.code.toLowerCase())) errors.push({ field: 'code', code: 'taken' });
  const length = shiftLength({ startTime: body.startTime, endTime: body.endTime, breakStart: body.breakStart ?? '', breakEnd: body.breakEnd ?? '' });
  return { errors, length };
}

function build(id: string, body: ShiftRequest, length: NonNullable<ReturnType<typeof shiftLength>>, active: boolean): Shift {
  return {
    ...body,
    id,
    code: body.code.toUpperCase(),
    active,
    crossesMidnight: length.crossesMidnight,
    scheduledMinutes: length.scheduledMinutes,
    nightMinutes: length.nightMinutes,
  };
}

export function shiftApi(source: Shift[] = SHIFTS, { delayMs = 0 }: { delayMs?: number } = {}): ShiftApi {
  const writes: ShiftWrite[] = [];
  // Writes change a copy: the fixture stays the same for the next test.
  const shifts = source.map((shift) => ({ ...shift }));
  const handlers = [
    http.get('*/api/shifts', async ({ request }) => {
      await delay(delayMs);
      const active = new URL(request.url).searchParams.get('active');
      return HttpResponse.json(shifts.filter((shift) => active === null || shift.active === (active === 'true')).sort((a, b) => a.startTime.localeCompare(b.startTime)));
    }),
    http.post('*/api/shifts', async ({ request }) => {
      const body = (await request.json()) as ShiftRequest;
      writes.push({ method: 'POST', body });
      await delay(delayMs);
      const { errors, length } = check(body, shifts, true);
      if (errors.length > 0 || !length) return invalid(errors.length > 0 ? errors : [{ field: 'endTime', code: 'same_as_start' }]);
      const added = build(`00000000-0000-4000-d000-0000000001${String(shifts.length).padStart(2, '0')}`, body, length, true);
      shifts.push(added);
      return HttpResponse.json(added, { status: 201 });
    }),
    http.put('*/api/shifts/:id', async ({ params, request }) => {
      const id = String(params.id);
      const body = (await request.json()) as ShiftRequest;
      writes.push({ method: 'PUT', id, body });
      await delay(delayMs);
      const found = shifts.find((shift) => shift.id === id);
      if (!found) return problem(404, 'shift.not_found');
      const { errors, length } = check(body, shifts, false);
      if (errors.length > 0 || !length) return invalid(errors.length > 0 ? errors : [{ field: 'endTime', code: 'same_as_start' }]);
      // The code is never changed.
      Object.assign(found, build(id, { ...body, code: found.code }, length, found.active));
      return HttpResponse.json(found);
    }),
    http.post('*/api/shifts/:id/deactivate', async ({ params }) => {
      writes.push({ method: 'deactivate', id: String(params.id) });
      await delay(delayMs);
      const found = shifts.find((shift) => shift.id === params.id);
      if (!found) return problem(404, 'shift.not_found');
      found.active = false;
      return HttpResponse.json(found);
    }),
    http.post('*/api/shifts/:id/reactivate', async ({ params }) => {
      writes.push({ method: 'reactivate', id: String(params.id) });
      await delay(delayMs);
      const found = shifts.find((shift) => shift.id === params.id);
      if (!found) return problem(404, 'shift.not_found');
      found.active = true;
      return HttpResponse.json(found);
    }),
  ];
  return { handlers, writes, shifts };
}
