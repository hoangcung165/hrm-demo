// The texts of a punch import: what is wrong with a row and how to fix it, and why a file was refused.
import type { TFunction } from 'i18next';
import { ApiError } from '@/lib/api';
import { formatFileSize, formatNumber } from '@/lib/format';
import type { PunchImportError } from './import-api';

const KEY = 'attendanceImport.error.';

/** The "Cách sửa" text of one row. */
export function rowErrorMessage(error: PunchImportError, t: TFunction): string {
  const value = error.value ?? '';
  switch (error.code) {
    case 'employee_code_missing':
      return t(`${KEY}employeeCodeMissing`);
    case 'employee_not_found':
      return t(`${KEY}employeeNotFound`, { value });
    case 'out_of_scope':
      return t(`${KEY}outOfScope`, { value });
    case 'time_missing':
      return t(`${KEY}timeMissing`);
    case 'time_invalid':
      return t(`${KEY}timeInvalid`, { value });
    case 'in_future':
      return t(`${KEY}inFuture`);
    case 'duplicate_in_file':
      return t(`${KEY}duplicate`, { row: error.firstRow ?? '' });
    default:
      return t(`${KEY}unknown`);
  }
}

/** Why a file was refused before or by the check: a client-side code (`file_type`, `file_too_large`) or the API's. */
export function fileProblemMessage(problem: unknown, file: File | null, t: TFunction): string {
  const name = file?.name ?? '';
  const size = file ? formatFileSize(file.size) : '';
  if (problem === 'file_type') return t(`${KEY}fileType`, { fileName: name });
  if (problem === 'file_too_large') return t(`${KEY}fileTooLarge`, { size });
  if (!(problem instanceof ApiError)) return t(`${KEY}checkFailed`);
  const details = problem.details;
  switch (problem.code) {
    case 'import.file_too_large':
      return t(`${KEY}fileTooLarge`, { size });
    case 'import.too_many_rows':
      return t(`${KEY}tooManyRows`, { n: formatNumber(Number(details.found ?? 0)), limit: formatNumber(Number(details.limit ?? 50_000)) });
    case 'import.headers_invalid':
      return t(`${KEY}headersInvalid`);
    case 'import.empty':
      return t(`${KEY}empty`);
    case 'import.file_invalid':
    case 'import.file_missing':
      return t(`${KEY}unreadable`);
    case 'import.file_changed':
      return t(`${KEY}fileChanged`);
    case 'import.nothing_to_import':
      return t(`${KEY}nothingLeft`);
    default:
      return t(`${KEY}checkFailed`);
  }
}
