// Import of Employees from Excel (HRM-07). Contract: "## API contract (update for BE-2, #150)" on issue #9. Stateless:
// the file is checked (`/validate`, nothing written), then sent again to be imported, with the checksum of the check.
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';
import { EMPLOYEES_KEY, type EmployeeRef, type EmployeeStatus, type Gender } from './api';

/** The limits of one file, the same as the server's. */
export const IMPORT_MAX_BYTES = 5 * 1024 * 1024;
export const IMPORT_MAX_ROWS = 1000;

export type ImportRowStatus = 'VALID' | 'INVALID' | 'EXISTING';

/** Mirrors `EmployeeImportSummary`: `totalRows = validRows + errorRows + existingRows`. */
export type ImportSummary = { totalRows: number; validRows: number; errorRows: number; existingRows: number };

/** Mirrors `EmployeeImportError`: one failing cell. `value` is masked like the screen without EMPLOYEE_SENSITIVE_VIEW. */
export type ImportCellError = {
  /** The Excel row number; the header is row 1. */
  row: number;
  /** The template's column letter, e.g. `E`. */
  column: string;
  /** The header without the required mark, e.g. `Số CCCD`. */
  header: string;
  /** The field path of `POST /api/employees`, e.g. `identity.idNumber`; `code` for Mã nhân viên. */
  field: string;
  code: string;
  value: string | null;
  /** `duplicate_in_file`: the other rows with the same value. */
  otherRows?: number[];
  /** `taken`: who holds the number, when the caller's scope covers them. */
  conflict?: EmployeeRef;
};

/** A unit or a Chức danh as a row names it. */
export type ImportRef = { code: string; name: string };

/** Mirrors `EmployeeImportRow`: a data row and what the import does with it. */
export type ImportRow = {
  row: number;
  status: ImportRowStatus;
  fullName: string | null;
  idNumber: string | null;
  /** `EXISTING`: matched by Mã nhân viên or by Số CCCD. */
  matchedBy: 'CODE' | 'ID_NUMBER' | null;
  /** `EXISTING`: the profile, when the caller's scope covers it. */
  existing: EmployeeRef | null;
  dateOfBirth: string | null;
  gender: Gender | null;
  orgUnit: ImportRef | null;
  position: ImportRef | null;
  manager: EmployeeRef | null;
  hireDate: string | null;
  employeeStatus: Exclude<EmployeeStatus, 'INACTIVE'> | null;
};

/** Mirrors `EmployeeImportValidation`. */
export type ImportCheck = { fileName: string; checksum: string; summary: ImportSummary; errors: ImportCellError[]; rows: ImportRow[] };

/** Mirrors `EmployeeImportResponse`: the created Employees in row order (their codes were issued in that order). */
export type ImportResult = {
  createdCount: number;
  existingRows: number;
  skippedInvalidRows: number;
  created: Array<{ row: number; id: string; code: string; fullName: string }>;
};

const form = (file: File, extra: Record<string, string> = {}) => {
  const body = new FormData();
  body.append('file', file);
  for (const [key, value] of Object.entries(extra)) body.append(key, value);
  return body;
};

/** Checks a file; nothing is written. Cancel with the signal. */
export function useCheckImport() {
  return useMutation({
    mutationFn: ({ file, signal }: { file: File; signal?: AbortSignal }) =>
      api<ImportCheck>('/api/employees/import/validate', { method: 'POST', body: form(file), signal }),
  });
}

export type ImportRequest = { file: File; checksum: string; skipInvalid: boolean };

/** Imports the checked file, all or nothing. The list and the next code are stale afterwards. */
export function useImportEmployees() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, checksum, skipInvalid }: ImportRequest) =>
      api<ImportResult>('/api/employees/import', { method: 'POST', body: form(file, { skipInvalid: String(skipInvalid), checksum }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: EMPLOYEES_KEY }),
  });
}

/** `import.rows_invalid`: the check under the lock found rows with errors; the fresh check comes with it. */
export function recheckOf(error: unknown): Omit<ImportCheck, 'fileName' | 'checksum'> | null {
  if (!(error instanceof ApiError) || error.code !== 'import.rows_invalid') return null;
  const { summary, errors, rows } = error.details as Partial<ImportCheck>;
  return summary && errors && rows ? { summary, errors, rows } : null;
}

export const isAbort = (error: unknown) => error instanceof DOMException && error.name === 'AbortError';
