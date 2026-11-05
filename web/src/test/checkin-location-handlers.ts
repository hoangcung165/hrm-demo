// MSW handlers for the Địa điểm chấm công (BE-2 and BE-3 of HRM-39: `/api/attendance/locations` and
// `/api/attendance/mobile-checkin-settings`), over a copy of the example places: list by name, add and edit with the
// backend's field errors, make inactive and active again, and the company-wide rules.
import { delay, http, HttpResponse, type HttpHandler } from 'msw';
import type { CheckinLocation, CheckinLocationRequest, CheckinRules } from '@/features/checkin-location/api';
import { problem } from './auth-handlers';

const at = '2026-11-03T03:00:00Z';
const place = (id: string, name: string, address: string | null, latitude: number, longitude: number, radiusMeters: number, punchesLast30Days: number, active = true): CheckinLocation => ({
  id: `00000000-0000-4000-e000-00000000000${id}`,
  name,
  address,
  latitude,
  longitude,
  radiusMeters,
  active,
  punchesLast30Days,
  createdAt: at,
  updatedAt: at,
});

/** The example places of the demo database. */
export const HOA_LAC = place('1', 'Trung tâm dữ liệu Hòa Lạc', 'Khu Công nghệ cao Hòa Lạc, Thạch Thất, Hà Nội', 21.009, 105.529, 200, 12);
export const HEAD_OFFICE = place('2', 'Văn phòng chính', 'Tầng 8, 22 Trần Thái Tông, Cầu Giấy, Hà Nội', 21.031, 105.789, 150, 148);
export const HCM_OFFICE = place('3', 'Văn phòng TP.HCM', null, 10.7769, 106.7009, 100, 37);
export const OLD_OFFICE = place('4', 'Văn phòng Duy Tân (cũ)', 'Số 5 Duy Tân, Cầu Giấy, Hà Nội', 21.0307, 105.7826, 120, 0, false);
export const LOCATIONS = [HOA_LAC, HEAD_OFFICE, HCM_OFFICE, OLD_OFFICE];

export const RULES: CheckinRules = {
  maxAccuracyMeters: 100,
  defaultMaxAccuracyMeters: 100,
  customized: false,
  updatedAt: null,
  updatedByName: null,
  everyEmployee: true,
  photoRequired: true,
  consentCount: 128,
};

export type LocationWrite = { method: 'POST' | 'PUT' | 'deactivate' | 'reactivate'; id?: string; body?: CheckinLocationRequest };

export type LocationApiOptions = {
  rules?: CheckinRules;
  delayMs?: number;
  /** The list answers 500. */
  failList?: boolean;
  /** The rules answer 500. */
  failRules?: boolean;
  /** Every write answers 403, as when the permission was taken away meanwhile. */
  denyWrites?: boolean;
};

export type LocationApi = {
  handlers: HttpHandler[];
  /** Every write, in order. */
  writes: LocationWrite[];
  /** The places as the handlers hold them now (a copy of the fixture, changed by the writes). */
  locations: CheckinLocation[];
};

const invalid = (errors: Array<{ field: string; code: string }>) => problem(400, 'validation.invalid', { errors });

/** The checks of `AttendanceLocationService`, as far as the form can break them; the client already stops most of these. */
function check(body: CheckinLocationRequest, others: CheckinLocation[]) {
  const errors: Array<{ field: string; code: string }> = [];
  if (others.some((each) => each.name.toLowerCase() === body.name.trim().toLowerCase())) errors.push({ field: 'name', code: 'taken' });
  if (body.radiusMeters < 50 || body.radiusMeters > 1000) errors.push({ field: 'radiusMeters', code: 'out_of_range' });
  return errors;
}

export function locationApi(source: CheckinLocation[] = LOCATIONS, { rules = RULES, delayMs = 0, failList = false, failRules = false, denyWrites = false }: LocationApiOptions = {}): LocationApi {
  const writes: LocationWrite[] = [];
  // Writes change a copy: the fixture stays the same for the next test.
  const locations = source.map((each) => ({ ...each }));
  const handlers = [
    http.get('*/api/attendance/locations', async () => {
      await delay(delayMs);
      if (failList) return problem(500, 'server.error');
      return HttpResponse.json([...locations].sort((a, b) => a.name.localeCompare(b.name, 'vi')));
    }),
    http.get('*/api/attendance/mobile-checkin-settings', async () => {
      await delay(delayMs);
      if (failRules) return problem(500, 'server.error');
      return HttpResponse.json(rules);
    }),
    http.post('*/api/attendance/locations', async ({ request }) => {
      const body = (await request.json()) as CheckinLocationRequest;
      writes.push({ method: 'POST', body });
      await delay(delayMs);
      if (denyWrites) return problem(403, 'access.denied');
      const errors = check(body, locations);
      if (errors.length > 0) return invalid(errors);
      const added: CheckinLocation = { ...body, id: `00000000-0000-4000-e000-0000000001${String(locations.length).padStart(2, '0')}`, name: body.name.trim(), active: true, punchesLast30Days: 0, createdAt: at, updatedAt: at };
      locations.push(added);
      return HttpResponse.json(added, { status: 201 });
    }),
    http.put('*/api/attendance/locations/:id', async ({ params, request }) => {
      const id = String(params.id);
      const body = (await request.json()) as CheckinLocationRequest;
      writes.push({ method: 'PUT', id, body });
      await delay(delayMs);
      if (denyWrites) return problem(403, 'access.denied');
      const found = locations.find((each) => each.id === id);
      if (!found) return problem(404, 'attendance_location.not_found');
      const errors = check(body, locations.filter((each) => each.id !== id));
      if (errors.length > 0) return invalid(errors);
      Object.assign(found, body);
      return HttpResponse.json(found);
    }),
    ...(['deactivate', 'reactivate'] as const).map((action) =>
      http.post(`*/api/attendance/locations/:id/${action}`, async ({ params }) => {
        writes.push({ method: action, id: String(params.id) });
        await delay(delayMs);
        if (denyWrites) return problem(403, 'access.denied');
        const found = locations.find((each) => each.id === params.id);
        if (!found) return problem(404, 'attendance_location.not_found');
        found.active = action === 'reactivate';
        return HttpResponse.json(found);
      }),
    ),
  ];
  return { handlers, writes, locations };
}
