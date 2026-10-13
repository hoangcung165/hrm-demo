// MSW handlers for the allocation writes of a project ("## Allocations (BE-3)" on issue #17): the candidates, the
// "try allocation" check, add, edit, end early and delete. The check answers from two people of the fixtures:
// Đặng Hữu Phước is overloaded by the allocation (60% on DA-029 until 31/10), Phan Khánh Duy is not.
import { http, HttpResponse, type HttpHandler } from 'msw';
import type { Allocation, EmployeeCard, LoadPeriod } from '@/features/project/api';
import type { AllocationCandidate, TryAllocationResult } from '@/features/project/allocation-api';
import { problem } from './auth-handlers';
import { projectId } from './project-fixtures';

const card = (n: number, fullName: string, orgUnitName: string): EmployeeCard => ({ id: `00000000-0000-4000-c000-${String(n).padStart(12, '0')}`, code: `NV${String(n).padStart(5, '0')}`, fullName, orgUnitName });

export const PHUOC = card(71, 'Đặng Hữu Phước', 'Nhóm Web');
export const DUY = card(72, 'Phan Khánh Duy', 'Nhóm Mobile');
export const LAN_CARD = card(65, 'Vũ Thị Lan', 'Phòng Phát triển phần mềm');

export const CANDIDATES: AllocationCandidate[] = [
  { employee: PHUOC, loadToday: 60, inProjectFrom: null },
  { employee: DUY, loadToday: 30, inProjectFrom: null },
  { employee: LAN_CARD, loadToday: 50, inProjectFrom: '2026-09-01' },
];

const DA029 = { projectId: projectId('DA-029'), projectCode: 'DA-029', projectName: 'Cổng khách hàng bảo hiểm', percent: 60, thisProject: false };
const DA031 = { projectId: projectId('DA-031'), projectCode: 'DA-031', projectName: 'Ứng dụng đặt lịch khám', percent: 60, thisProject: true };
const OVERLAP: LoadPeriod = { from: '2026-10-14', to: '2026-10-31', totalPercent: 120, overloaded: true, parts: [DA029, DA031] };

export const OVERLOADED_CHECK: TryAllocationResult = {
  employee: PHUOC,
  peak: 120,
  overloaded: true,
  periods: [
    { from: '2026-10-01', to: '2026-10-13', totalPercent: 60, overloaded: false, parts: [DA029] },
    OVERLAP,
    { from: '2026-11-01', to: '2026-12-31', totalPercent: 60, overloaded: false, parts: [DA031] },
  ],
  overloadedPeriods: [OVERLAP],
  suggestedMaxPercent: 40,
  suggestedStart: '2026-11-01',
};

export const OK_CHECK: TryAllocationResult = {
  employee: DUY,
  peak: 80,
  overloaded: false,
  periods: [{ from: '2026-10-14', to: '2026-12-31', totalPercent: 80, overloaded: false, parts: [{ ...DA031, projectId: projectId('DA-027'), projectCode: 'DA-027', percent: 30, thisProject: false }, { ...DA031, percent: 50 }] }],
  overloadedPeriods: [],
  suggestedMaxPercent: null,
  suggestedStart: null,
};

export type AllocationWrite = { method: 'POST' | 'PUT' | 'END' | 'DELETE'; id?: string; body?: Record<string, unknown> };

export type AllocationWriteApi = {
  handlers: HttpHandler[];
  /** The body of every "try allocation" call, in order. */
  tries: Array<Record<string, unknown>>;
  writes: AllocationWrite[];
};

export type AllocationWriteOptions = {
  /** What the check answers for a body; by default Phước is overloaded and anyone else is not. */
  check?: (body: Record<string, unknown>) => TryAllocationResult;
  /** The check answers this problem instead. */
  failCheck?: boolean;
  /** Add, edit, end early and delete answer this problem. */
  failWith?: [number, string, object?];
};

const defaultCheck = (body: Record<string, unknown>) => (body.employeeId === PHUOC.id ? OVERLOADED_CHECK : OK_CHECK);

export function allocationWriteApi({ check = defaultCheck, failCheck = false, failWith }: AllocationWriteOptions = {}): AllocationWriteApi {
  const tries: Array<Record<string, unknown>> = [];
  const writes: AllocationWrite[] = [];
  const saved = (body: Record<string, unknown>, id: string): Allocation => ({
    id,
    projectId: projectId('DA-031'),
    employee: body.employeeId === PHUOC.id ? PHUOC : DUY,
    projectRole: { id: String(body.projectRoleId), code: 'DEV', name: 'Lập trình viên', active: true },
    percent: Number(body.percent),
    startDate: String(body.startDate),
    endDate: String(body.endDate),
    status: 'UPCOMING',
    peakLoad: check(body).peak,
    overloadedPeriods: check(body).overloadedPeriods,
  });
  const fail = () => (failWith ? problem(failWith[0], failWith[1], failWith[2]) : null);
  const handlers = [
    http.get('*/api/projects/:id/allocation-candidates', ({ request }) => {
      const q = (new URL(request.url).searchParams.get('q') ?? '').toLowerCase();
      return HttpResponse.json(CANDIDATES.filter((each) => !q || each.employee.fullName.toLowerCase().includes(q) || each.employee.code.toLowerCase().includes(q)));
    }),
    http.post('*/api/projects/:id/allocations/try', async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      tries.push(body);
      return failCheck ? problem(500, 'error.unknown') : HttpResponse.json(check(body));
    }),
    http.post('*/api/projects/:id/allocations', async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      writes.push({ method: 'POST', body });
      return fail() ?? HttpResponse.json({ allocation: saved(body, '00000000-0000-4000-e000-000000000099'), check: check(body) }, { status: 201 });
    }),
    http.put('*/api/projects/:id/allocations/:allocationId', async ({ request, params }) => {
      const body = (await request.json()) as Record<string, unknown>;
      writes.push({ method: 'PUT', id: String(params.allocationId), body });
      return fail() ?? HttpResponse.json({ allocation: saved({ ...body, employeeId: PHUOC.id }, String(params.allocationId)), check: check({ ...body, employeeId: PHUOC.id }) });
    }),
    http.post('*/api/projects/:id/allocations/:allocationId/end', async ({ request, params }) => {
      const body = (await request.json()) as Record<string, unknown>;
      writes.push({ method: 'END', id: String(params.allocationId), body });
      return fail() ?? HttpResponse.json({ allocation: saved({ ...body, employeeId: DUY.id, percent: 50, startDate: '2026-09-01', projectRoleId: 'role' }, String(params.allocationId)), check: OK_CHECK });
    }),
    http.delete('*/api/projects/:id/allocations/:allocationId', ({ params }) => {
      writes.push({ method: 'DELETE', id: String(params.allocationId) });
      return fail() ?? new HttpResponse(null, { status: 204 });
    }),
  ];
  return { handlers, tries, writes };
}
