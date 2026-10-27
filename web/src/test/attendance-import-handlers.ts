// MSW handlers for the punch log import (HRM-23, BE-1 #327 and BE-4 #352): a check with every kind of row error, a clean
// one, a file whose punches are all stored already, and the answers of the import. They record what was sent.
import { delay, http, HttpResponse } from 'msw';
import type { PunchErrorCode, PunchImportCheck, PunchImportItem, PunchImportResult } from '@/features/attendance/import-api';
import { problem } from './auth-handlers';

export const PUNCH_FILE_NAME = 'log-thang-10.csv';

const error = (row: number, code: PunchErrorCode, value: string | null, firstRow: number | null = null) => ({ row, code, value, firstRow });

/** 9 rows read: 5 new, 1 already stored, 3 with errors (one of each kind a person fixes by hand). */
export function punchCheck(): PunchImportCheck {
  return {
    fileName: PUNCH_FILE_NAME,
    checksum: 'sha256:a91c07',
    summary: { rowsRead: 9, newPunches: 5, alreadyImported: 1, errorRows: 3, employees: 3, from: '2026-10-12T01:15:00Z', to: '2026-10-13T10:30:00Z' },
    errors: [error(4, 'employee_not_found', 'NV9999'), error(7, 'time_invalid', '31/13/2026 08:00'), error(9, 'duplicate_in_file', 'NV00003', 3)],
  };
}

/** The same file with the error rows fixed away. */
export function cleanPunchCheck(): PunchImportCheck {
  return { ...punchCheck(), summary: { ...punchCheck().summary, rowsRead: 6, errorRows: 0 }, errors: [] };
}

/** Importing the same file again: every punch is stored already. */
export function storedPunchCheck(): PunchImportCheck {
  return { ...punchCheck(), summary: { ...punchCheck().summary, rowsRead: 6, newPunches: 0, alreadyImported: 6, errorRows: 0 }, errors: [] };
}

export function punchResult(stored = 5): PunchImportResult {
  return { importId: '00000000-0000-4000-a000-000000000001', rowsRead: 9, stored, alreadyImported: 1, refused: 3 };
}

export const recentImports: PunchImportItem[] = [
  { id: '1', fileName: 'log-tuan-41.csv', importedAt: '2026-10-19T02:10:00Z', importedBy: 'Lê Thu Hà', rowsRead: 1200, rowsStored: 1180, rowsExisting: 20, rowsRefused: 0 },
  { id: '2', fileName: null, importedAt: '2026-10-12T02:10:00Z', importedBy: 'Lê Thu Hà', rowsRead: 40, rowsStored: 38, rowsExisting: 0, rowsRefused: 2 },
];

type Failure = { status: number; code: string; extra?: object };
type CheckAnswer = PunchImportCheck | Failure | 'network';
type ImportAnswer = PunchImportResult | Failure | 'network';

export type PunchImportApi = {
  handlers: Array<ReturnType<typeof http.post> | ReturnType<typeof http.get>>;
  checks: Array<{ size: number }>;
  imports: Array<{ skipInvalid: string | null; checksum: string | null; size: number }>;
};

const answer = (value: CheckAnswer | ImportAnswer, status: number) => {
  if (value === 'network') return HttpResponse.error();
  if ('code' in value && 'status' in value) return problem(value.status, value.code, value.extra);
  return HttpResponse.json(value, { status });
};

/** Each request takes the next answer of its list; the last one repeats. */
export function punchImportApi({
  check = [punchCheck()],
  result = [punchResult()],
  recent = recentImports as PunchImportItem[] | Failure,
  delayMs = 0,
}: { check?: CheckAnswer[]; result?: ImportAnswer[]; recent?: PunchImportItem[] | Failure; delayMs?: number } = {}): PunchImportApi {
  const checks: PunchImportApi['checks'] = [];
  const imports: PunchImportApi['imports'] = [];
  const handlers = [
    http.post('*/api/attendance/punch-imports/check', async ({ request }) => {
      const file = (await request.formData()).get('file') as File | null;
      checks.push({ size: file?.size ?? 0 });
      await delay(delayMs);
      return answer(check[Math.min(checks.length - 1, check.length - 1)]!, 200);
    }),
    http.post('*/api/attendance/punch-imports', async ({ request }) => {
      const body = await request.formData();
      imports.push({ skipInvalid: body.get('skipInvalid') as string | null, checksum: body.get('checksum') as string | null, size: (body.get('file') as File | null)?.size ?? 0 });
      await delay(delayMs);
      return answer(result[Math.min(imports.length - 1, result.length - 1)]!, 201);
    }),
    http.get('*/api/attendance/punch-imports', () => (Array.isArray(recent) ? HttpResponse.json(recent) : problem(recent.status, recent.code, recent.extra))),
  ];
  return { handlers, checks, imports };
}
