// MSW handlers for the employee import ("## API contract (update for BE-2, #150)" on issue #9) with a realistic
// check: rows 2–6 of a file, two valid, two with errors (one of them a CCCD repeated on another row), and one that
// already exists. The handlers record what was sent.
import { delay, http, HttpResponse } from 'msw';
import type { ImportCheck, ImportResult, ImportRow } from '@/features/employee/import-api';
import { problem } from './auth-handlers';
import { employeeCode, employeeId } from './employee-fixtures';

const valid = (row: number, fullName: string, idNumber: string, employeeStatus: 'PROBATION' | 'OFFICIAL'): ImportRow => ({
  row,
  status: 'VALID',
  fullName,
  idNumber,
  matchedBy: null,
  existing: null,
  dateOfBirth: '1996-04-12',
  gender: 'FEMALE',
  orgUnit: { code: 'WEB', name: 'Nhóm Web' },
  position: { code: 'CV', name: 'Chuyên viên' },
  manager: null,
  hireDate: '2026-11-02',
  employeeStatus,
});
const blank = { matchedBy: null, existing: null, dateOfBirth: null, gender: null, orgUnit: null, position: null, manager: null, hireDate: null, employeeStatus: null } as const;

export const IMPORT_FILE_NAME = 'nhan-vien-moi.xlsx';

/** The check of a file with every kind of row. */
export function importCheck(): ImportCheck {
  return {
    fileName: IMPORT_FILE_NAME,
    checksum: 'sha256:5f1c0d',
    summary: { totalRows: 5, validRows: 2, errorRows: 2, existingRows: 1 },
    errors: [
      { row: 4, column: 'E', header: 'Số CCCD', field: 'identity.idNumber', code: 'invalid', value: '01234567' },
      { row: 4, column: 'M', header: 'Mã đơn vị', field: 'job.orgUnitId', code: 'not_found', value: 'WEBX' },
      { row: 6, column: 'E', header: 'Số CCCD', field: 'identity.idNumber', code: 'duplicate_in_file', value: '079196001234', otherRows: [2] },
      { row: 6, column: 'C', header: 'Ngày sinh', field: 'personal.dateOfBirth', code: 'invalid', value: '1996-31-12' },
    ],
    rows: [
      valid(2, 'Đỗ Thị Hoa', '079196001234', 'PROBATION'),
      valid(3, 'Vương Minh Khang', '079195004321', 'OFFICIAL'),
      { ...blank, row: 4, status: 'INVALID', fullName: 'Lục Thanh Tâm', idNumber: '01234567' },
      { ...blank, row: 5, status: 'EXISTING', fullName: 'Trần Thị Mai', idNumber: '079190000003', matchedBy: 'ID_NUMBER', existing: { id: employeeId(3), code: employeeCode(3), fullName: 'Trần Thị Mai' } },
      { ...blank, row: 6, status: 'INVALID', fullName: null, idNumber: '079196001234' },
    ],
  };
}

/** A check without errors: the same file with the error rows fixed away. */
export function cleanCheck(): ImportCheck {
  const check = importCheck();
  return { ...check, summary: { totalRows: 3, validRows: 2, errorRows: 0, existingRows: 1 }, errors: [], rows: check.rows.filter((row) => row.status !== 'INVALID') };
}

export function importResult(created = 2): ImportResult {
  return {
    createdCount: created,
    existingRows: 1,
    skippedInvalidRows: 2,
    created: [
      { row: 2, id: employeeId(901), code: 'NV00025', fullName: 'Đỗ Thị Hoa' },
      { row: 3, id: employeeId(902), code: 'NV00026', fullName: 'Vương Minh Khang' },
    ].slice(0, created),
  };
}

type CheckAnswer = ImportCheck | { status: number; code: string; extra?: object } | 'network';
type ImportAnswer = ImportResult | { status: number; code: string; extra?: object } | 'network';

export type ImportApi = {
  handlers: Array<ReturnType<typeof http.post>>;
  /** The size of the file of every check (jsdom's File loses its name on the way through Node's fetch). */
  checks: Array<{ size: number }>;
  /** The fields of every import: `skipInvalid`, `checksum` and the file's size. */
  imports: Array<{ skipInvalid: string | null; checksum: string | null; size: number }>;
};

const answer = (value: CheckAnswer | ImportAnswer, status: number) => {
  if (value === 'network') return HttpResponse.error();
  if ('code' in value && 'status' in value) return problem(value.status, value.code, value.extra);
  return HttpResponse.json(value, { status });
};

/** Each request takes the next answer of its list; the last one repeats. */
export function importApi({ check = [importCheck()], result = [importResult()], delayMs = 0 }: { check?: CheckAnswer[]; result?: ImportAnswer[]; delayMs?: number } = {}): ImportApi {
  const checks: ImportApi['checks'] = [];
  const imports: ImportApi['imports'] = [];
  const handlers = [
    http.post('*/api/employees/import/validate', async ({ request }) => {
      const file = (await request.formData()).get('file') as File | null;
      checks.push({ size: file?.size ?? 0 });
      await delay(delayMs);
      return answer(check[Math.min(checks.length - 1, check.length - 1)]!, 200);
    }),
    http.post('*/api/employees/import', async ({ request }) => {
      const body = await request.formData();
      imports.push({ skipInvalid: body.get('skipInvalid') as string | null, checksum: body.get('checksum') as string | null, size: (body.get('file') as File | null)?.size ?? 0 });
      await delay(delayMs);
      return answer(result[Math.min(imports.length - 1, result.length - 1)]!, 201);
    }),
  ];
  return { handlers, checks, imports };
}

export const nextCodeOk = (code = 'NV00025') => http.get('*/api/employees/next-code', () => HttpResponse.json({ code }));
