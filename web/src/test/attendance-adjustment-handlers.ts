// MSW handlers for Đơn bổ sung công (HRM-24/BE-3): Nguyễn Văn An punched In at 07:58 on Monday 12/10/2026 and forgot
// his Out. The check, the request (pending, with one level waiting for Lê Văn Hùng), and the send, edit and cancel
// calls, which are recorded.
import { http, HttpResponse } from 'msw';
import type { AdjustmentCheck, AdjustmentDetail } from '@/features/attendance/adjustment-api';
import type { ApprovalRequestDetail } from '@/features/approval/api';
import { problem } from './auth-handlers';
import { AN, HUNG } from './approval-fixtures';
import { OFFICE } from './attendance-daily-handlers';

export const ADJUSTMENT_ID = '00000000-0000-4000-d000-000000000001';
const base = { shiftId: OFFICE.id, lateMinutes: 0, earlyLeaveMinutes: 0, holiday: null, leave: null, noLog: false, manual: null } as const;
export const DAY_NOW = { ...base, date: '2026-10-12', in: '2026-10-12T07:58:00+07:00', out: null, workedMinutes: 0, flags: ['MISSING_OUT' as const], inSource: 'PUNCH' as const, outSource: null };
export const DAY_AFTER = { ...base, date: '2026-10-12', in: '2026-10-12T07:58:00+07:00', out: '2026-10-12T17:05:00+07:00', workedMinutes: 480, flags: [], inSource: 'PUNCH' as const, outSource: 'ADJUSTMENT' as const };

export function adjustmentCheck(over: Partial<AdjustmentCheck> = {}): AdjustmentCheck {
  return { date: '2026-10-12', day: DAY_NOW, shift: OFFICE, inMissing: false, outMissing: true, problems: [], approvers: { levelCount: 1, firstLevel: [HUNG], autoApproveDays: 3 }, ...over };
}

function approval(status: ApprovalRequestDetail['status'], sender = AN): ApprovalRequestDetail {
  return {
    id: ADJUSTMENT_ID, type: 'ATTENDANCE_ADJUSTMENT', status, level: 1, levelCount: 1, summary: 'Bổ sung công 12/10/2026: ra 17:05', sender,
    sentAt: '2026-10-13T09:00:00+07:00', autoApproveDays: 3, autoApproveDueAt: status === 'PENDING' ? '2026-10-16T09:00:00+07:00' : null,
    steps: [{ level: 1, rule: 'LINE_MANAGER', role: null, state: status === 'PENDING' ? 'WAITING' : 'RETURNED', approvers: [HUNG], escalated: false, decidedBy: status === 'PENDING' ? null : HUNG, onBehalfOf: null, decidedAt: status === 'PENDING' ? null : '2026-10-13T10:00:00+07:00', comment: status === 'PENDING' ? null : 'Ghi rõ giờ về', autoApproved: false }],
    log: [], allowed: { decide: false, onBehalfOf: null, resubmit: status === 'RETURNED_FOR_INFO', cancel: true },
  };
}

export function adjustmentDetail(over: Partial<AdjustmentDetail> = {}): AdjustmentDetail {
  return {
    id: ADJUSTMENT_ID, status: 'PENDING', employee: AN, date: '2026-10-12', shift: OFFICE, in: null, out: '2026-10-12T17:05:00+07:00', reason: 'Quên quẹt khi về',
    dayNow: DAY_NOW, dayAfter: DAY_AFTER, approval: approval('PENDING'), canEdit: false, canCancel: true, createdAt: '2026-10-13T02:00:00Z', updatedAt: '2026-10-13T02:00:00Z', ...over,
  };
}

export const returnedDetail = () => adjustmentDetail({ status: 'RETURNED', approval: approval('RETURNED_FOR_INFO'), canEdit: true });

type Failure = { status: number; code: string; errors?: Array<{ field: string; code: string }> };
export type AdjustmentApi = { handlers: Array<ReturnType<typeof http.get>>; sent: unknown[]; edited: unknown[]; cancelled: number };

export function adjustmentApi({ check = adjustmentCheck(), detail = adjustmentDetail(), send = undefined as Failure | undefined } = {}): AdjustmentApi {
  const api: AdjustmentApi = { handlers: [], sent: [], edited: [], cancelled: 0 };
  let current = detail;
  api.handlers = [
    http.get('*/api/attendance/adjustments/check', () => HttpResponse.json(check)),
    http.get('*/api/attendance/adjustments/:id', () => HttpResponse.json(current)),
    http.post('*/api/attendance/adjustments', async ({ request }) => {
      api.sent.push(await request.json());
      return send ? problem(send.status, send.code, send.errors ? { errors: send.errors } : {}) : HttpResponse.json(current, { status: 201 });
    }),
    http.put('*/api/attendance/adjustments/:id', async ({ request }) => {
      api.edited.push(await request.json());
      current = adjustmentDetail();
      return HttpResponse.json(current);
    }),
    http.post('*/api/attendance/adjustments/:id/cancel', () => {
      api.cancelled += 1;
      current = { ...current, status: 'CANCELLED', canCancel: false, canEdit: false };
      return HttpResponse.json(current);
    }),
  ];
  return api;
}
