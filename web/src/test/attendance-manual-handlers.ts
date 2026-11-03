// MSW handlers for Công thủ công (HRM-24/BE-2): Nhóm Web over 12–18/10/2026 with two people. An has Đủ công on Monday
// and 08:20–17:00 on Tuesday; Bình has no shift on Wednesday. Saturday and Sunday have no shift. The handlers record
// every save and clear, and the page reads the entries again after each.
import { delay, http, HttpResponse } from 'msw';
import type { ManualAttendance, ManualRow, ManualSaveResult } from '@/features/attendance/manual-api';
import { problem } from './auth-handlers';

export const AN = { id: '00000000-0000-4000-b000-000000000021', code: 'NV00021', fullName: 'Nguyễn Văn An', orgUnitName: 'Nhóm Web' };
export const BINH = { id: '00000000-0000-4000-b000-000000000022', code: 'NV00022', fullName: 'Trần Thị Bình', orgUnitName: 'Nhóm Web' };
const WEEKDAYS = ['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16'];

export function manualData(): ManualAttendance {
  const an: ManualRow = {
    employee: AN, orgUnitId: null, shiftDays: WEEKDAYS,
    entries: [
      { date: '2026-10-12', kind: 'FULL', in: null, out: null, note: 'Đi công tác', enteredBy: 'Trần Thị Mai', enteredAt: '2026-10-19T09:15:00+07:00' },
      { date: '2026-10-13', kind: 'TIMES', in: '08:20', out: '17:00', note: null, enteredBy: 'Trần Thị Mai', enteredAt: '2026-10-19T09:16:00+07:00' },
    ],
  };
  const binh: ManualRow = { employee: BINH, orgUnitId: null, shiftDays: WEEKDAYS.filter((day) => day !== '2026-10-14'), entries: [] };
  return { from: '2026-10-12', to: '2026-10-18', rows: [an, binh] };
}

type Failure = { status: number; code: string; errors?: Array<{ field: string; code: string }> };
export type ManualApi = { handlers: Array<ReturnType<typeof http.get>>; saves: unknown[]; clears: unknown[]; lists: URLSearchParams[] };

export function manualApi({
  list = manualData() as ManualAttendance | Failure,
  save = { employees: 1, created: 1, replaced: 0, unchanged: 0, skipped: [] } as ManualSaveResult | Failure,
  delayMs = 0,
}: { list?: ManualAttendance | Failure; save?: ManualSaveResult | Failure; delayMs?: number } = {}): ManualApi {
  const saves: unknown[] = [];
  const clears: unknown[] = [];
  const lists: URLSearchParams[] = [];
  const fail = (failure: Failure) => problem(failure.status, failure.code, failure.errors ? { errors: failure.errors } : {});
  const handlers = [
    http.get('*/api/attendance/manual', ({ request }) => {
      lists.push(new URL(request.url).searchParams);
      return 'status' in list ? fail(list) : HttpResponse.json(list);
    }),
    http.put('*/api/attendance/manual', async ({ request }) => {
      saves.push(await request.json());
      await delay(delayMs);
      return 'status' in save ? fail(save) : HttpResponse.json(save);
    }),
    http.delete('*/api/attendance/manual', async ({ request }) => {
      clears.push(await request.json());
      return HttpResponse.json({ employees: 1, removed: 2 });
    }),
  ];
  return { handlers, saves, clears, lists };
}
