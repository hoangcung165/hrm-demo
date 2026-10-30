// MSW handlers for the headcount charts of Tổng quan (HRM-20/BE-3): Employees per unit and joins and leaves per month.
import { http, HttpResponse } from 'msw';
import type { DashboardHeadcount } from '@/features/dashboard/headcount-api';
import { problem } from './auth-handlers';

const UNIT = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

export const HEADCOUNT: DashboardHeadcount = {
  date: '2026-10-30',
  byUnit: [
    { orgUnitId: UNIT(1), orgUnitName: 'Nhóm Web', count: 59 },
    { orgUnitId: UNIT(2), orgUnitName: 'Nhóm Di động', count: 42 },
    { orgUnitId: UNIT(3), orgUnitName: 'Phòng Kinh doanh', count: 28 },
    { orgUnitId: null, orgUnitName: null, count: 1 },
  ],
  months: [
    { month: '2026-05', joins: 4, leaves: 1 },
    { month: '2026-06', joins: 2, leaves: 2 },
    { month: '2026-07', joins: 6, leaves: 1 },
    { month: '2026-08', joins: 5, leaves: 0 },
    { month: '2026-09', joins: 7, leaves: 2 },
    { month: '2026-10', joins: 3, leaves: 1 },
  ],
};
export const UNIT_IDS = { web: UNIT(1), mobile: UNIT(2) };

export type HeadcountApi = { handler: ReturnType<typeof http.get>; /** How many times the headcount was asked for. */ calls: () => number };

export function headcountApi(body: DashboardHeadcount = HEADCOUNT): HeadcountApi {
  let calls = 0;
  return {
    calls: () => calls,
    handler: http.get('*/api/dashboard/headcount', () => {
      calls += 1;
      return HttpResponse.json(body);
    }),
  };
}

/** What a signed-in approver gets by default: nobody and no movement. */
export const headcountEmpty = () => http.get('*/api/dashboard/headcount', () => HttpResponse.json({ date: '2026-10-30', byUnit: [], months: [] } satisfies DashboardHeadcount));
export const headcountFail = () => http.get('*/api/dashboard/headcount', () => problem(500, 'error.unknown'));
