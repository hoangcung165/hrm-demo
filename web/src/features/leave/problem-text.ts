// What a problem of the check says on the form: a title with the numbers and the fix, from the problem's code and
// details (the API's `LeaveProblem`). Unknown codes fall back to a general line.
import type { TFunction } from 'i18next';
import { formatDate } from '@/lib/format';
import { formatDays } from './leave-format';
import type { LeaveProblem } from './request-api';

export type ProblemText = { title: string; text: string };

const num = (value: unknown) => formatDays(Number(value ?? 0));

const KNOWN = new Set([
  'leave.invalid_dates',
  'leave.invalid_part',
  'leave.half_day_not_allowed',
  'leave.range_too_long',
  'leave.no_policy',
  'leave.before_hire',
  'leave.no_working_day',
  'leave.over_max_per_request',
  'leave.attachment_required',
  'leave.overlap',
  'leave.over_balance',
]);

export function problemText(t: TFunction, problem: LeaveProblem, typeName: string): ProblemText {
  const d = problem.details;
  const key = KNOWN.has(problem.code) ? problem.code.replace('leave.', '') : 'unknown';
  const dates = Array.isArray(d.dates) ? (d.dates as string[]).map((date) => formatDate(date)).join(', ') : '';
  const advance = Number(d.advanceAvailable ?? 0) > 0;
  const values = {
    type: typeName,
    max: num(d.max ?? d.maxDays),
    hireDate: typeof d.hireDate === 'string' ? formatDate(d.hireDate) : '',
    dates,
    over: num(d.over),
    remaining: num(d.remaining),
    advance: num(d.advanceAvailable),
    available: num(d.available),
    year: String(d.year ?? ''),
  };
  return {
    title: t(`leave.problem.${key}.title`, values),
    text: t(key === 'over_balance' && !advance ? 'leave.problem.over_balance.textNoAdvance' : `leave.problem.${key}.text`, values),
  };
}
