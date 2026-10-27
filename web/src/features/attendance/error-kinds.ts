// The tabs of the error table: the row error codes grouped the way HR thinks of them. Only the kinds that occur get a tab.
import type { PunchErrorCode } from './import-api';

export type ErrorKind = 'ALL' | 'NOT_FOUND' | 'OUT_OF_SCOPE' | 'TIME' | 'DUPLICATE' | 'CODE_MISSING' | 'FUTURE';

const KIND_OF: Record<PunchErrorCode, Exclude<ErrorKind, 'ALL'>> = {
  employee_not_found: 'NOT_FOUND',
  out_of_scope: 'OUT_OF_SCOPE',
  time_missing: 'TIME',
  time_invalid: 'TIME',
  duplicate_in_file: 'DUPLICATE',
  employee_code_missing: 'CODE_MISSING',
  in_future: 'FUTURE',
};

/** The order of the tabs after "Tất cả lỗi". */
export const KIND_ORDER: Array<Exclude<ErrorKind, 'ALL'>> = ['NOT_FOUND', 'OUT_OF_SCOPE', 'TIME', 'DUPLICATE', 'CODE_MISSING', 'FUTURE'];

export const kindOfCode = (code: PunchErrorCode): Exclude<ErrorKind, 'ALL'> => KIND_OF[code] ?? 'TIME';
