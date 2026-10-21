// A failed Phân ca call, as a sentence that says the cause and the fix: an i18n key and its values.
import { ApiError } from '@/lib/api';

export type AssignProblem = { key: string; values?: Record<string, unknown> };

// `validation.invalid` names the field and a short reason (`ShiftAssignmentService.error`).
const FIELD_PROBLEMS: Record<string, string> = {
  'to:range_too_long': 'shiftAssign.error.rangeTooLong',
  'to:before_from': 'shiftAssign.error.rangeOrder',
  'from:required': 'shiftAssign.error.rangeRequired',
  'to:required': 'shiftAssign.error.rangeRequired',
  'shiftId:required': 'shiftAssign.error.shiftRequired',
  'employeeIds:required': 'shiftAssign.error.peopleRequired',
  'employeeIds:too_many_people': 'shiftAssign.error.tooMany',
  'orgUnitId:too_many_people': 'shiftAssign.error.tooMany',
  'employeeIds:not_found': 'shiftAssign.error.personGone',
  'employeeIds:inactive': 'shiftAssign.error.personGone',
};

const CODE_PROBLEMS: Record<string, string> = {
  'shift.inactive': 'shiftAssign.error.shiftInactive',
  'shift.not_found': 'shiftAssign.error.shiftGone',
  'org_unit.not_found': 'shiftAssign.error.unitGone',
};

export function assignProblem(error: unknown): AssignProblem {
  if (!(error instanceof ApiError)) return { key: 'shiftAssign.error.network' };
  if (error.code === 'shift_assignment.out_of_scope') return { key: 'shiftAssign.error.outOfScope', values: { count: Number(error.details.count ?? 0) } };
  if (error.code === 'validation.invalid') {
    for (const { field, code } of error.fieldErrors) {
      const key = FIELD_PROBLEMS[`${field}:${code}`];
      if (key) return { key };
    }
  }
  if (CODE_PROBLEMS[error.code]) return { key: CODE_PROBLEMS[error.code] };
  if (error.status === 403) return { key: 'shiftAssign.error.denied' };
  return { key: 'shiftAssign.error.generic' };
}
