// MSW handlers for "Thêm nhân viên" ("## API contract" on issue #8): the next code, the default manager of a unit,
// the Employee picker, and POST /api/employees with the backend's conflicts on the identity numbers (the fixture
// profiles hold them). Register them after the profile handler: `GET /api/employees/:id` would also match.
import { delay, http, HttpResponse } from 'msw';
import type { EmployeeCreateRequest, EmployeeProfile } from '@/features/employee/api';
import type { FieldError } from '@/lib/api';
import { problem } from './auth-handlers';
import { EMPLOYEES, employeeId } from './employee-fixtures';
import { employeeProfile } from './employee-profile-handlers';
import { orgStructure } from './org-unit-fixtures';

/** The Trưởng đơn vị of each fixture unit, by Employee number. */
const HEADS: Record<string, number> = { PTPM: 2, HCNS: 3, TCKT: 4, DVKH: 5, KD: 6, WEB: 7, MOBILE: 8, CNDN: 9, DEVOPS: 10, DATA: 11, QA: 13, TK: 15, HTKH: 17, KDGP: 18, PMDN: 20, MKT: 21 };
const plain = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, 'd').toLowerCase();
const ref = (number: number) => {
  const item = EMPLOYEES.find((each) => each.id === employeeId(number))!;
  return { id: item.id, code: item.code, fullName: item.fullName };
};

export type EmployeeCreateApiOptions = {
  delayMs?: number;
  /** Answer the POST with `validation.invalid` and these errors. */
  invalid?: FieldError[];
  /** Answer the POST with this problem code (409), e.g. `employee.position_inactive`. */
  conflict?: string;
};

export function employeeCreateApi({ delayMs = 0, invalid, conflict }: EmployeeCreateApiOptions = {}) {
  const writes: EmployeeCreateRequest[] = [];
  const managerRequests: string[] = [];
  let created: EmployeeProfile | null = null;
  const handlers = [
    http.get('*/api/employees/next-code', () => HttpResponse.json({ code: 'NV00027' })),
    http.get('*/api/employees/default-manager', ({ request }) => {
      const orgUnitId = new URL(request.url).searchParams.get('orgUnitId') ?? '';
      managerRequests.push(orgUnitId);
      const unit = orgStructure().units.find((each) => each.id === orgUnitId);
      const head = unit ? HEADS[unit.code] : undefined;
      return HttpResponse.json({ manager: head ? ref(head) : null });
    }),
    http.get('*/api/employees/options', ({ request }) => {
      const q = plain(new URL(request.url).searchParams.get('q') ?? '');
      const items = EMPLOYEES.filter((each) => each.status !== 'INACTIVE' && (!q || plain(each.fullName).includes(q) || plain(each.code).includes(q)))
        .sort((a, b) => plain(a.fullName).localeCompare(plain(b.fullName)))
        .slice(0, 20)
        .map((each) => ({ id: each.id, code: each.code, fullName: each.fullName, status: each.status, orgUnitName: each.orgUnit?.name ?? null, positionName: each.position?.name ?? null }));
      return HttpResponse.json({ items, total: items.length });
    }),
    http.post('*/api/employees', async ({ request }) => {
      const body = (await request.json()) as EmployeeCreateRequest;
      writes.push(body);
      await delay(delayMs);
      if (invalid) return problem(400, 'validation.invalid', { errors: invalid });
      if (conflict) return problem(409, conflict);
      const holder = EMPLOYEES.find((each) => employeeProfile(each).identity.idNumber === body.identity.idNumber);
      if (holder) return problem(409, 'employee.id_number_taken', { employee: { id: holder.id, code: holder.code, fullName: holder.fullName } });
      const unit = orgStructure().units.find((each) => each.id === body.job.orgUnitId);
      created = {
        id: '00000000-0000-4000-b000-000000000027',
        code: 'NV00027',
        fullName: body.fullName,
        status: body.job.status,
        personal: { ...body.personal, gender: body.personal.gender ?? 'FEMALE' },
        identity: { masked: false, ...body.identity },
        job: {
          orgUnit: unit ? { id: unit.id, code: unit.code, name: unit.name, active: unit.active, parentName: orgStructure().units.find((each) => each.id === unit.parentId)?.name ?? null } : null,
          position: { id: body.job.positionId!, code: 'NV', name: 'Nhân viên', active: true },
          manager: unit && HEADS[unit.code] ? ref(HEADS[unit.code]!) : null,
          managerSource: body.job.managerId ? 'ASSIGNED' : 'UNIT_HEAD',
          hireDate: body.job.hireDate!,
        },
        createdAt: '2026-10-07T03:00:00Z',
        updatedAt: '2026-10-07T03:00:00Z',
      };
      return HttpResponse.json(created, { status: 201 });
    }),
    // The new profile; any other id goes on to the profile handler.
    http.get('*/api/employees/:id', ({ params }) => (created && params.id === created.id ? HttpResponse.json(created) : undefined)),
  ];
  return { handlers, writes, managerRequests };
}

