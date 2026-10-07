// MSW handlers for the three saves of a profile ("## API contract" on issue #8): PUT …/personal, …/identity and
// …/job over the fixture profiles, with the backend's refusals: a number another Employee holds (409 with the
// holder), a manager that is the Employee itself or reports to them (400 `manager_invalid`, SELF or CYCLE), and a
// status change of an Employee who left. Each save answers with the whole profile.
import { delay, http, HttpResponse } from 'msw';
import type { EmployeeProfile } from '@/features/employee/api';
import type { ProfilePart, ProfilePartBody } from '@/features/employee/form-api';
import type { FieldError } from '@/lib/api';
import { problem } from './auth-handlers';
import { EMPLOYEES } from './employee-fixtures';
import { employeeProfile } from './employee-profile-handlers';
import { orgStructure } from './org-unit-fixtures';

export type EmployeeEditApiOptions = {
  delayMs?: number;
  /** Answer every save with `validation.invalid` and these errors. */
  invalid?: FieldError[];
  /** Answer every save with this status (403 or 404). */
  status?: 403 | 404;
};

export type EmployeeEditWrite = { [P in ProfilePart]: { part: P; id: string; body: ProfilePartBody[P] } }[ProfilePart];

export function employeeEditApi({ delayMs = 0, invalid, status }: EmployeeEditApiOptions = {}) {
  const writes: EmployeeEditWrite[] = [];
  const saved = new Map<string, EmployeeProfile>();
  const profileOf = (id: string) => {
    const item = EMPLOYEES.find((each) => each.id === id);
    return saved.get(id) ?? (item ? employeeProfile(item) : undefined);
  };
  const answer = (id: string, change: (profile: EmployeeProfile) => EmployeeProfile) => {
    const next = { ...change(profileOf(id)!), updatedAt: '2026-10-07T04:00:00Z' };
    saved.set(id, next);
    return HttpResponse.json(next);
  };
  const handler = http.put('*/api/employees/:id/:part', async ({ params, request }) => {
    const id = String(params.id);
    const part = String(params.part) as ProfilePart;
    const body = (await request.json()) as never;
    writes.push({ part, id, body } as EmployeeEditWrite);
    await delay(delayMs);
    if (status) return problem(status, status === 403 ? 'auth.forbidden' : 'employee.not_found');
    if (!profileOf(id)) return problem(404, 'employee.not_found');
    if (invalid) return problem(400, 'validation.invalid', { errors: invalid });
    if (part === 'personal') {
      const { fullName, personal } = body as ProfilePartBody['personal'];
      return answer(id, (profile) => ({ ...profile, fullName, personal: { ...personal, gender: personal.gender ?? profile.personal.gender } }));
    }
    if (part === 'identity') {
      const identity = body as ProfilePartBody['identity'];
      const holder = EMPLOYEES.find((each) => each.id !== id && employeeProfile(each).identity.idNumber === identity.idNumber);
      if (holder) return problem(409, 'employee.id_number_taken', { employee: { id: holder.id, code: holder.code, fullName: holder.fullName } });
      return answer(id, (profile) => ({ ...profile, identity: { masked: false, ...identity } }));
    }
    const job = body as ProfilePartBody['job'];
    const current = profileOf(id)!;
    if (current.status === 'INACTIVE') return problem(409, 'employee.status_change_not_allowed');
    if (job.managerId === id) return problem(400, 'employee.manager_invalid', { reason: 'SELF' });
    const manager = EMPLOYEES.find((each) => each.id === job.managerId);
    if (manager?.manager?.id === id) return problem(400, 'employee.manager_invalid', { reason: 'CYCLE' });
    const unit = orgStructure().units.find((each) => each.id === job.orgUnitId);
    return answer(id, (profile) => ({
      ...profile,
      status: job.status,
      job: {
        ...profile.job,
        orgUnit: unit ? { id: unit.id, code: unit.code, name: unit.name, active: unit.active } : null,
        manager: manager ? { id: manager.id, code: manager.code, fullName: manager.fullName } : profile.job.manager,
        managerSource: job.managerId ? 'ASSIGNED' : 'UNIT_HEAD',
        hireDate: job.hireDate!,
      },
    }));
  });
  return { handler, writes };
}
