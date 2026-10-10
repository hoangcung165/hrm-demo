// MSW handlers for the approval flows ("## API contract" comment on issue #14, BE-2): the defaults of every request
// type, and saving one (stored, so the list answers with it afterwards).
import { http, HttpResponse } from 'msw';
import type { ApprovalRequestType } from '@/features/approval/api';
import type { ApprovalFlow, ApprovalFlowInput } from '@/features/approval/flow-api';

const flow = (requestType: ApprovalRequestType, levels: ApprovalFlow['levels'], autoApproveDays: number | null, delegation = true): ApprovalFlow => ({
  requestType,
  levels,
  autoApproveDays,
  delegationAllowed: delegation,
  automationAllowed: requestType !== 'PAYROLL',
  customized: false,
  updatedAt: null,
});
const LM = { rule: 'LINE_MANAGER' as const, role: null };
const role = (r: 'HR' | 'ACCOUNTANT' | 'DIRECTOR') => ({ rule: 'ROLE' as const, role: r });

export const DEFAULT_FLOWS: ApprovalFlow[] = [
  flow('PROFILE_UPDATE', [LM, role('HR')], 3),
  flow('LEAVE', [LM], 3),
  flow('OVERTIME', [LM], null),
  flow('ATTENDANCE_ADJUSTMENT', [LM], 3),
  flow('TIMESHEET', [{ rule: 'PROJECT_MANAGER', role: null }], 5),
  flow('PAYROLL', [role('HR'), role('ACCOUNTANT'), role('DIRECTOR')], null, false),
];

export function approvalFlowApi() {
  const flows = DEFAULT_FLOWS.map((f) => ({ ...f }));
  const saved: Array<{ type: string; body: ApprovalFlowInput }> = [];
  return {
    saved,
    handlers: [
      http.get('*/api/approval-flows', () => HttpResponse.json({ items: flows })),
      http.put('*/api/approval-flows/:type', async ({ params, request }) => {
        const body = (await request.json()) as ApprovalFlowInput;
        saved.push({ type: String(params.type), body });
        const i = flows.findIndex((f) => f.requestType === params.type);
        flows[i] = { ...flows[i]!, ...body, customized: true, updatedAt: new Date().toISOString() };
        return HttpResponse.json(flows[i]);
      }),
    ],
  };
}
