// MSW handlers for the Tổng quan API (HRM-20). Contracts: "## API contract" comments on issue #22.
import { delay, http, HttpResponse } from 'msw';
import type { DashboardTiles } from '@/features/dashboard/api';
import { problem } from './auth-handlers';

export const DASHBOARD_TILES: DashboardTiles = { date: '2026-11-04', employees: 186, inProbation: 12, onLeaveToday: 4, workingToday: 183 };

export type TilesApi = { handler: ReturnType<typeof http.get>; /** How many times the tiles were asked for. */ calls: () => number };

export function tilesApi(tiles: DashboardTiles = DASHBOARD_TILES, { delayMs = 0 }: { delayMs?: number } = {}): TilesApi {
  let calls = 0;
  return {
    calls: () => calls,
    handler: http.get('*/api/dashboard/tiles', async () => {
      calls += 1;
      if (delayMs) await delay(delayMs);
      return HttpResponse.json(tiles);
    }),
  };
}

export const tilesFail = () => http.get('*/api/dashboard/tiles', () => problem(500, 'error.unknown'));
