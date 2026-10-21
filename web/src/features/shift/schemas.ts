// The add/edit form of a Ca làm việc, validated by the same rules as the backend (`ShiftService.pattern`).
// Messages are i18n keys, so the schema stays free of UI text.
import { z } from 'zod';
import { normalizeTime, shiftLength, toMinutes } from './duration';
import { ROUNDING_MODES, ROUNDING_STEPS, type RoundingMode, type Shift, type ShiftRequest } from './api';

export const CODE_MAX = 20;
export const NAME_MAX = 100;
export const TOLERANCE_MAX = 120;
const CODE_PATTERN = /^[A-Za-z0-9_-]{1,20}$/;

/** Everything is what is typed, so a half-typed number or time is not lost. */
export type ShiftValues = {
  code: string;
  name: string;
  startTime: string;
  endTime: string;
  breakStart: string;
  breakEnd: string;
  lateToleranceMinutes: string;
  earlyToleranceMinutes: string;
  roundingMode: RoundingMode;
  roundingMinutes: string;
};

export type ShiftField = keyof ShiftValues;

export function initialValues(shift: Shift | null): ShiftValues {
  if (!shift) {
    return { code: '', name: '', startTime: '08:00', endTime: '17:00', breakStart: '', breakEnd: '', lateToleranceMinutes: '0', earlyToleranceMinutes: '0', roundingMode: 'NONE', roundingMinutes: '15' };
  }
  return {
    code: shift.code,
    name: shift.name,
    startTime: shift.startTime,
    endTime: shift.endTime,
    breakStart: shift.breakStart ?? '',
    breakEnd: shift.breakEnd ?? '',
    lateToleranceMinutes: String(shift.lateToleranceMinutes),
    earlyToleranceMinutes: String(shift.earlyToleranceMinutes),
    roundingMode: shift.roundingMode,
    roundingMinutes: String(shift.roundingMinutes ?? 15),
  };
}

const text = z.string().trim();

export const shiftSchema = z
  .object({
    code: text,
    name: text.min(1, 'shifts.validation.nameRequired').max(NAME_MAX, 'shifts.validation.nameTooLong'),
    startTime: text,
    endTime: text,
    breakStart: text,
    breakEnd: text,
    lateToleranceMinutes: text,
    earlyToleranceMinutes: text,
    roundingMode: z.enum(ROUNDING_MODES),
    roundingMinutes: text,
  })
  .superRefine((values, ctx) => {
    const fail = (field: ShiftField, message: string) => ctx.addIssue({ code: 'custom', path: [field], message });
    if (!values.code) fail('code', 'shifts.validation.codeRequired');
    else if (!CODE_PATTERN.test(values.code)) fail('code', 'shifts.validation.code');

    const time = (field: 'startTime' | 'endTime' | 'breakStart' | 'breakEnd', required: string | null): boolean => {
      const value = normalizeTime(values[field]);
      if (!value) {
        if (required) fail(field, required);
        return false;
      }
      if (toMinutes(value) === null) {
        fail(field, 'shifts.validation.time');
        return false;
      }
      return true;
    };
    const startOk = time('startTime', 'shifts.validation.startRequired');
    const endOk = time('endTime', 'shifts.validation.endRequired');
    if (startOk && endOk && normalizeTime(values.startTime) === normalizeTime(values.endTime)) fail('endTime', 'shifts.validation.endSameAsStart');

    const hasBreakStart = Boolean(values.breakStart);
    const hasBreakEnd = Boolean(values.breakEnd);
    if (hasBreakStart || hasBreakEnd) {
      const breakStartOk = time('breakStart', 'shifts.validation.breakBoth');
      const breakEndOk = time('breakEnd', 'shifts.validation.breakBoth');
      if (startOk && endOk && breakStartOk && breakEndOk && normalizeTime(values.startTime) !== normalizeTime(values.endTime)) {
        const times = { startTime: normalizeTime(values.startTime), endTime: normalizeTime(values.endTime), breakStart: normalizeTime(values.breakStart), breakEnd: normalizeTime(values.breakEnd) };
        if (shiftLength(times) === null) {
          // Either the break ends before it starts, or it leaves the shift.
          fail('breakStart', toMinutes(times.breakStart) === toMinutes(times.breakEnd) ? 'shifts.validation.breakEmpty' : 'shifts.validation.breakOutside');
        }
      }
    }

    for (const field of ['lateToleranceMinutes', 'earlyToleranceMinutes'] as const) {
      const value = values[field];
      if (!/^\d{1,3}$/.test(value) || Number(value) > TOLERANCE_MAX) fail(field, 'shifts.validation.tolerance');
    }
    if (values.roundingMode !== 'NONE' && !ROUNDING_STEPS.some((step) => String(step) === values.roundingMinutes)) fail('roundingMinutes', 'shifts.validation.roundingStep');
  });

/** What the API gets. Takes values zod has already trimmed. */
export function toRequest(values: ShiftValues): ShiftRequest {
  const hasBreak = Boolean(values.breakStart || values.breakEnd);
  return {
    code: values.code.trim().toUpperCase(),
    name: values.name.trim(),
    startTime: normalizeTime(values.startTime),
    endTime: normalizeTime(values.endTime),
    breakStart: hasBreak ? normalizeTime(values.breakStart) : null,
    breakEnd: hasBreak ? normalizeTime(values.breakEnd) : null,
    lateToleranceMinutes: Number(values.lateToleranceMinutes),
    earlyToleranceMinutes: Number(values.earlyToleranceMinutes),
    roundingMode: values.roundingMode,
    roundingMinutes: values.roundingMode === 'NONE' ? null : Number(values.roundingMinutes),
  };
}

/** Edit: whether the form would send anything other than the shift has. The code is never changed. */
export function shiftChanged(values: ShiftValues, shift: Shift): boolean {
  const now = toRequest(values);
  const before = toRequest(initialValues(shift));
  return (Object.keys(now) as Array<keyof ShiftRequest>).some((key) => key !== 'code' && now[key] !== before[key]);
}
