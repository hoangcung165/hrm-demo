import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api';
import { assignProblem } from './assign-errors';

describe('assignProblem', () => {
  it('names the people outside the scope', () => {
    expect(assignProblem(new ApiError(403, 'shift_assignment.out_of_scope', [], { count: 3 }))).toEqual({ key: 'shiftAssign.error.outOfScope', values: { count: 3 } });
  });

  it('maps a field error to its sentence, whichever field comes first in the answer', () => {
    const error = new ApiError(400, 'validation.invalid', [{ field: 'to', code: 'range_too_long' }]);
    expect(assignProblem(error).key).toBe('shiftAssign.error.rangeTooLong');
    expect(assignProblem(new ApiError(400, 'validation.invalid', [{ field: 'employeeIds', code: 'too_many_people' }])).key).toBe('shiftAssign.error.tooMany');
  });

  it('maps the codes of a shift and a unit that are gone, and falls back to a general sentence', () => {
    expect(assignProblem(new ApiError(409, 'shift.inactive')).key).toBe('shiftAssign.error.shiftInactive');
    expect(assignProblem(new ApiError(404, 'shift.not_found')).key).toBe('shiftAssign.error.shiftGone');
    expect(assignProblem(new ApiError(404, 'org_unit.not_found')).key).toBe('shiftAssign.error.unitGone');
    expect(assignProblem(new ApiError(403, 'auth.forbidden')).key).toBe('shiftAssign.error.denied');
    expect(assignProblem(new ApiError(500, 'internal')).key).toBe('shiftAssign.error.generic');
    expect(assignProblem(new TypeError('Failed to fetch')).key).toBe('shiftAssign.error.network');
  });
});
