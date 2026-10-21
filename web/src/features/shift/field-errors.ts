// Server validation errors of the shift form, mapped to the field and the message that says the cause and the fix.
import { ApiError } from '@/lib/api';
import type { ShiftField } from './schemas';

/** A server error shown under a field: an i18n key. */
export type ShiftFieldError = { field: ShiftField; message: string };

// Backend `validation.invalid` errors name the field and a short reason (`ShiftService.pattern`).
const MESSAGES: Record<string, Partial<Record<string, string>>> = {
  code: { required: 'shifts.validation.codeRequired', invalid: 'shifts.validation.code', taken: 'shifts.validation.codeTaken' },
  name: { required: 'shifts.validation.nameRequired', too_long: 'shifts.validation.nameTooLong' },
  startTime: { required: 'shifts.validation.startRequired', invalid: 'shifts.validation.time' },
  endTime: { required: 'shifts.validation.endRequired', invalid: 'shifts.validation.time', same_as_start: 'shifts.validation.endSameAsStart' },
  breakStart: { required: 'shifts.validation.breakBoth', invalid: 'shifts.validation.time', outside_shift: 'shifts.validation.breakOutside', empty: 'shifts.validation.breakEmpty' },
  breakEnd: { required: 'shifts.validation.breakBoth', invalid: 'shifts.validation.time' },
  lateToleranceMinutes: { required: 'shifts.validation.tolerance', out_of_range: 'shifts.validation.tolerance', invalid: 'shifts.validation.tolerance' },
  earlyToleranceMinutes: { required: 'shifts.validation.tolerance', out_of_range: 'shifts.validation.tolerance', invalid: 'shifts.validation.tolerance' },
  roundingMode: { required: 'shifts.validation.roundingMode', invalid: 'shifts.validation.roundingMode' },
  roundingMinutes: { required: 'shifts.validation.roundingStep', invalid: 'shifts.validation.roundingStep' },
};

const FIELDS: ShiftField[] = ['code', 'name', 'startTime', 'endTime', 'breakStart', 'breakEnd', 'lateToleranceMinutes', 'earlyToleranceMinutes', 'roundingMode', 'roundingMinutes'];

/** The field errors a failed save maps to, in form order so the first can take focus; empty when it is not about a field. */
export function shiftFieldErrors(error: unknown): ShiftFieldError[] {
  if (!(error instanceof ApiError) || error.code !== 'validation.invalid') return [];
  return FIELDS.flatMap((field) => {
    const found = error.fieldErrors.find((candidate) => candidate.field === field);
    return found ? [{ field, message: MESSAGES[field]?.[found.code] ?? 'error.validation.invalid' }] : [];
  });
}
