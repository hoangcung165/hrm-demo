// Import of the Log quẹt thẻ (HRM-23). Contract: BE-1 (#327) and BE-4 (#352), "## API contract" on issue #25.
// Stateless like the Employee import: the file is checked (`/check`, nothing written), then sent again to be imported,
// with the checksum of the check.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';

/** The limits of one file, the same as the server's. */
export const PUNCH_IMPORT_MAX_BYTES = 5 * 1024 * 1024;
export const PUNCH_IMPORT_MAX_ROWS = 50_000;
/** The check lists at most this many rows with errors; `summary.errorRows` has the real count. */
export const PUNCH_IMPORT_MAX_ERRORS_LISTED = 1000;

/** Mirrors `PunchImportSummary`; `from` and `to` are instants (UTC) of the earliest and latest valid punch. */
export type PunchImportSummary = {
  rowsRead: number;
  newPunches: number;
  alreadyImported: number;
  errorRows: number;
  employees: number;
  from: string | null;
  to: string | null;
};

export type PunchErrorCode = 'employee_code_missing' | 'employee_not_found' | 'out_of_scope' | 'time_missing' | 'time_invalid' | 'in_future' | 'duplicate_in_file';

/** Mirrors `PunchImportError`: a row that cannot be imported. `row` counts the header as row 1. */
export type PunchImportError = { row: number; code: PunchErrorCode; value: string | null; firstRow: number | null };

/** Mirrors `PunchImportValidation`. */
export type PunchImportCheck = { fileName: string; checksum: string; summary: PunchImportSummary; errors: PunchImportError[] };

/** Mirrors `PunchImportResponse`. */
export type PunchImportResult = { importId: string; rowsRead: number; stored: number; alreadyImported: number; refused: number };

/** Mirrors `PunchImportItem`: an earlier import. */
export type PunchImportItem = {
  id: string;
  fileName: string | null;
  importedAt: string;
  importedBy: string | null;
  rowsRead: number;
  rowsStored: number;
  rowsExisting: number;
  rowsRefused: number;
};

const RECENT_KEY = ['attendance', 'punch-imports'] as const;
/** The daily attendance that an import changes (read by the daily list). */
export const ATTENDANCE_DAILY_KEY = ['attendance', 'daily'] as const;

const form = (file: File, extra: Record<string, string> = {}) => {
  const body = new FormData();
  body.append('file', file);
  for (const [key, value] of Object.entries(extra)) body.append(key, value);
  return body;
};

/** Checks a file; nothing is written. Cancel with the signal. */
export function useCheckPunchImport() {
  return useMutation({
    mutationFn: ({ file, signal }: { file: File; signal?: AbortSignal }) =>
      api<PunchImportCheck>('/api/attendance/punch-imports/check', { method: 'POST', body: form(file), signal }),
  });
}

export type PunchImportRequest = { file: File; checksum: string; skipInvalid: boolean };

/** Imports the checked file, all or nothing. The recent imports and the daily attendance are stale afterwards. */
export function useImportPunches() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, checksum, skipInvalid }: PunchImportRequest) =>
      api<PunchImportResult>('/api/attendance/punch-imports', { method: 'POST', body: form(file, { skipInvalid: String(skipInvalid), checksum }) }),
    onSuccess: () => Promise.all([queryClient.invalidateQueries({ queryKey: RECENT_KEY }), queryClient.invalidateQueries({ queryKey: ATTENDANCE_DAILY_KEY })]),
  });
}

/** "Lần nhập gần đây": the last imports, newest first. A failure only hides the panel. */
export function useRecentPunchImports(limit = 3) {
  return useQuery({
    queryKey: [...RECENT_KEY, limit],
    queryFn: () => api<PunchImportItem[]>(`/api/attendance/punch-imports?limit=${limit}`),
    retry: false,
  });
}

/** `import.rows_invalid`: the check under the lock found rows with errors; the fresh summary and errors come with it. */
export function recheckOf(error: unknown): Pick<PunchImportCheck, 'summary' | 'errors'> | null {
  if (!(error instanceof ApiError) || error.code !== 'import.rows_invalid') return null;
  const { summary, errors } = error.details as Partial<PunchImportCheck>;
  return summary && errors ? { summary, errors } : null;
}

export const isAbort = (error: unknown) => error instanceof DOMException && error.name === 'AbortError';
