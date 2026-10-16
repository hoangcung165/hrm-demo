// MSW handlers for the leave API (contract on issue #20) over the fixtures, with state: the check counts weekdays
// (half days at the ends) and finds the problems the screens show (over the balance of Phép năm, a missing file for
// Nghỉ ốm, more than the type allows per request); sending, cancelling and the settings are recorded.
import { http, HttpResponse } from 'msw';
import type { LeaveBalances, LeaveRequestDetail, LeaveRequestListItem } from '@/features/leave/api';
import type { LeavePolicyValues, LeaveTypeItem } from '@/features/leave/policy-api';
import type { LeaveRequestPayload } from '@/features/leave/request-api';
import { HUNG } from './approval-fixtures';
import { problem } from './auth-handlers';
import { LAN, MINE, TRI, TYPES, balancesOf, daysOf, detailFor, refOf, requestId } from './leave-fixtures';

export type LeaveApiOptions = {
  balances?: LeaveBalances;
  mine?: LeaveRequestListItem[];
  types?: LeaveTypeItem[];
  /** The balances answer 500. */
  failBalances?: boolean;
  /** The settings answer 403 (no LEAVE_POLICY_EDIT). */
  denyTypes?: boolean;
  /** The request detail is the approver's view. */
  approver?: boolean;
};

export type LeaveApi = {
  handlers: Array<ReturnType<typeof http.get>>;
  checks: LeaveRequestPayload[];
  sent: Array<{ id: string | null; body: LeaveRequestPayload }>;
  cancelled: string[];
  createdTypes: unknown[];
  updatedTypes: Array<{ id: string; body: unknown }>;
  savedPolicies: Array<{ id: string; body: LeavePolicyValues }>;
  uploads: string[];
};

export function leaveApi({ balances = balancesOf(), mine = MINE, types = TYPES, failBalances = false, denyTypes = false, approver = false }: LeaveApiOptions = {}): LeaveApi {
  const api: LeaveApi = { handlers: [], checks: [], sent: [], cancelled: [], createdTypes: [], updatedTypes: [], savedPolicies: [], uploads: [] };
  const details = new Map<string, LeaveRequestDetail>(mine.map((item) => [item.id, detailFor(item, approver)]));
  const typeState = [...types];
  const check = (body: LeaveRequestPayload) => {
    const t = typeState.find((each) => each.id === body.leaveTypeId)!;
    const days = body.endDate < body.startDate ? [] : daysOf(body.startDate, body.startPart, body.endDate, body.endPart);
    const total = days.reduce((sum, day) => sum + day.value, 0);
    const item = balances.items.find((each) => each.leaveType.id === t.id);
    const problems: Array<{ code: string; details: Record<string, unknown> }> = [];
    if (body.endDate < body.startDate) problems.push({ code: 'leave.invalid_dates', details: {} });
    if (t.policy?.maxDaysPerRequest && total > t.policy.maxDaysPerRequest) problems.push({ code: 'leave.over_max_per_request', details: { max: t.policy.maxDaysPerRequest } });
    if (t.policy?.attachmentRequired && body.attachmentIds.length === 0) problems.push({ code: 'leave.attachment_required', details: {} });
    const b = item?.balance;
    if (b?.limited && total > b.available!) {
      problems.push({ code: 'leave.over_balance', details: { year: b.year, requested: total, remaining: b.remaining, advanceAvailable: b.advanceAvailable, available: b.available, over: total - b.available! } });
    }
    return { days, total, balance: b ?? null, remainingAfter: b?.limited ? b.remaining! - total : null, problems, approvers: { levelCount: 1, firstLevel: [HUNG], autoApproveDays: 3 } };
  };
  const store = (id: string, body: LeaveRequestPayload): LeaveRequestDetail => {
    const t = typeState.find((each) => each.id === body.leaveTypeId)!;
    const total = check(body).total;
    const item: LeaveRequestListItem = { id, status: 'PENDING', leaveType: refOf(t), startDate: body.startDate, startPart: body.startPart, endDate: body.endDate, endPart: body.endPart, days: total, canCancel: true, createdAt: new Date().toISOString() };
    const detail = { ...detailFor(item), reason: body.reason, cc: [LAN, TRI].filter((p) => body.cc.includes(p.id)) };
    details.set(id, detail);
    return detail;
  };
  api.handlers = [
    // The app shell of an Account linked to an Employee asks for these on every screen.
    http.get('*/api/approvals/counts', () => HttpResponse.json({ waiting: 0, sent: 0 })),
    http.get('*/api/notifications/unread-count', () => HttpResponse.json({ unread: 0 })),
    http.get('*/api/leave-balances', () => (failBalances ? problem(500, 'internal') : HttpResponse.json(balances))),
    http.get('*/api/leave-types', ({ request }) => {
      const all = new URL(request.url).searchParams.get('all') === 'true';
      if (all && denyTypes) return problem(403, 'auth.forbidden');
      return HttpResponse.json({ items: all ? typeState : typeState.filter((t) => t.active), canEdit: !denyTypes });
    }),
    http.post('*/api/leave-types', async ({ request }) => {
      const body = (await request.json()) as { code: string; name: string; policy: LeavePolicyValues };
      api.createdTypes.push(body);
      if (body.code.toUpperCase() === 'PN') return problem(400, 'validation.invalid', { errors: [{ field: 'code', code: 'taken' }] });
      const created: LeaveTypeItem = { id: 'lt-new', code: body.code.toUpperCase(), name: body.name, sortOrder: 9, active: true, policy: body.policy, versions: [body.policy] };
      typeState.push(created);
      return HttpResponse.json(created, { status: 201 });
    }),
    http.put('*/api/leave-types/:id/policy', async ({ params, request }) => {
      const body = (await request.json()) as LeavePolicyValues;
      const id = String(params.id);
      api.savedPolicies.push({ id, body });
      const index = typeState.findIndex((t) => t.id === id);
      const versions = [...typeState[index]!.versions.filter((v) => v.effectiveFrom !== body.effectiveFrom), body].sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
      typeState[index] = { ...typeState[index]!, versions };
      return HttpResponse.json(typeState[index]);
    }),
    http.put('*/api/leave-types/:id', async ({ params, request }) => {
      const body = (await request.json()) as { name: string; active: boolean };
      const id = String(params.id);
      api.updatedTypes.push({ id, body });
      const index = typeState.findIndex((t) => t.id === id);
      typeState[index] = { ...typeState[index]!, name: body.name, active: body.active };
      return HttpResponse.json(typeState[index]);
    }),
    http.get('*/api/leave-requests/cc-candidates', ({ request }) => {
      const q = (new URL(request.url).searchParams.get('q') ?? '').toLowerCase();
      return HttpResponse.json([LAN, TRI].filter((p) => !q || p.fullName.toLowerCase().includes(q)));
    }),
    http.post('*/api/leave-requests/check', async ({ request }) => {
      const body = (await request.json()) as LeaveRequestPayload;
      api.checks.push(body);
      return HttpResponse.json(check(body));
    }),
    http.post('*/api/leave-requests/:id/cancel', ({ params }) => {
      const found = details.get(String(params.id))!;
      api.cancelled.push(found.id);
      const after = { ...found, status: 'CANCELLED' as const, canCancel: false, canEdit: false, cancelledAt: new Date().toISOString() };
      details.set(found.id, after);
      return HttpResponse.json(after);
    }),
    http.get('*/api/leave-requests/:id', ({ params }) => {
      const found = details.get(String(params.id));
      return found ? HttpResponse.json(found) : problem(404, 'approval.not_found');
    }),
    http.put('*/api/leave-requests/:id', async ({ params, request }) => {
      const body = (await request.json()) as LeaveRequestPayload;
      api.sent.push({ id: String(params.id), body });
      return HttpResponse.json(store(String(params.id), body));
    }),
    http.get('*/api/leave-requests', () => HttpResponse.json({ items: mine, total: mine.length })),
    http.post('*/api/leave-requests', async ({ request }) => {
      const body = (await request.json()) as LeaveRequestPayload;
      api.sent.push({ id: null, body });
      const problems = check(body).problems;
      if (problems.length) return problem(400, problems[0]!.code, { problems });
      return HttpResponse.json(store(requestId(99), body), { status: 201 });
    }),
    http.post('*/api/leave-attachments', async ({ request }) => {
      const file = (await request.formData()).get('file') as File;
      // jsdom loses the name of a File sent in a FormData ("blob"); the tests upload one PDF of this name.
      const name = file.name === 'blob' ? 'giay-kham.pdf' : file.name;
      api.uploads.push(name);
      return HttpResponse.json({ id: `file-${api.uploads.length}`, fileName: name, contentType: file.type, sizeBytes: file.size, uploadedAt: new Date().toISOString() }, { status: 201 });
    }),
  ];
  return api;
}
