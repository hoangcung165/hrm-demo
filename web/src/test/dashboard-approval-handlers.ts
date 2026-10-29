// MSW handlers for "Chờ bạn duyệt" (HRM-20): the dashboard list over fixture requests, and the inbox's approve and
// reject, which take the request off the list as the server does.
import { http, HttpResponse } from 'msw';
import type { ApprovalInboxItem, ApprovalRequestDetail, ApprovalStatus } from '@/features/approval/api';
import type { DashboardApprovalItem } from '@/features/dashboard/approvals-api';
import { problem } from './auth-handlers';
import { approvalId, AN, HUNG } from './approval-fixtures';

const request = (n: number, overrides: Partial<ApprovalInboxItem>): ApprovalInboxItem => ({
  id: approvalId(n), type: 'LEAVE', status: 'PENDING', level: 1, levelCount: 1, rule: 'LINE_MANAGER', role: null,
  summary: 'Thứ Ba 20/10 (sáng) · 0,5 ngày', sender: AN, sentAt: '2026-10-12T02:00:00Z', autoApproveDueAt: null,
  onBehalfOf: null, resubmitted: false, updatedAt: '2026-10-12T02:00:00Z', ...overrides,
});

const HAN = { id: 'e-31', code: 'NV0031', fullName: 'Trương Thị Ngọc Hân', orgUnitName: 'Nhóm Web' };
const QUYNH = { id: 'e-32', code: 'NV0032', fullName: 'Mạc Thị Quỳnh', orgUnitName: 'Nhóm Web' };

/** Four waiting requests: a plain leave, a profile update with a second level, an advance leave (a warning) and one more. */
export const QUICK_ITEMS: DashboardApprovalItem[] = [
  { request: request(1, { sender: HAN }), warnings: [], quickApprovable: true },
  { request: request(2, { type: 'PROFILE_UPDATE', sender: QUYNH, summary: '3 trường: số điện thoại, địa chỉ', level: 1, levelCount: 2 }), warnings: [], quickApprovable: true },
  { request: request(3, { sender: AN, summary: 'Thứ Hai 26/10 · 1 ngày' }), warnings: [{ code: 'leave.advance', details: { remaining: '-1.5' } }], quickApprovable: false },
  { request: request(4, { sender: HUNG, autoApproveDueAt: '2026-10-30T02:00:00Z' }), warnings: [], quickApprovable: true },
];

const step = (level: number, rule: 'LINE_MANAGER' | 'ROLE', role: 'HR' | null, state: 'DONE' | 'WAITING' | 'NOT_REACHED') => ({
  level, rule, role, state, approvers: [], escalated: false, decidedBy: null, onBehalfOf: null, decidedAt: null, comment: null, autoApproved: false,
});

export type QuickApi = {
  handlers: ReturnType<typeof http.get>[];
  /** The decisions sent, in order: id, decision and body. */
  decisions: { id: string; decision: string; body: Record<string, unknown> }[];
  /** How many times the dashboard list was asked for. */
  lists: () => number;
};

/**
 * `total` counts requests beyond the rows (the block shows five). `fail` makes one request answer 409 or 500; a
 * profile update (level 1 of 2) only moves on to level 2.
 */
export function quickApi(items: DashboardApprovalItem[] = QUICK_ITEMS, { total, fail = {} }: { total?: number; fail?: Record<string, 409 | 500> } = {}): QuickApi {
  const decided = new Set<string>();
  const decisions: QuickApi['decisions'] = [];
  let lists = 0;
  const list = http.get('*/api/dashboard/approvals', () => {
    lists += 1;
    const rows = items.filter((item) => !decided.has(item.request.id));
    return HttpResponse.json({ items: rows, total: total === undefined ? rows.length : total - decided.size });
  });
  const decide = http.post('*/api/approvals/:id/:decision', async ({ params, request: req }) => {
    const id = String(params.id);
    const decision = String(params.decision);
    decisions.push({ id, decision, body: (await req.json()) as Record<string, unknown> });
    if (fail[id] === 409) {
      decided.add(id);
      return problem(409, 'approval.already_handled', { status: 'CANCELLED' });
    }
    if (fail[id] === 500) return problem(500, 'error.unknown');
    const item = items.find((candidate) => candidate.request.id === id)!;
    decided.add(id);
    const moves = decision === 'approve' && item.request.level < item.request.levelCount;
    const status: ApprovalStatus = decision === 'reject' ? 'REJECTED' : moves ? 'PENDING' : 'APPROVED';
    const detail = {
      ...item.request, status, level: moves ? item.request.level + 1 : item.request.level, autoApproveDays: null,
      steps: [step(1, 'LINE_MANAGER', null, 'DONE'), step(2, 'ROLE', 'HR', moves ? 'WAITING' : 'NOT_REACHED')], log: [],
      allowed: { decide: false, onBehalfOf: null, resubmit: false, cancel: false },
    } satisfies ApprovalRequestDetail;
    return HttpResponse.json(detail);
  });
  return { handlers: [list, decide] as never, decisions, lists: () => lists };
}

export const quickEmpty = () => http.get('*/api/dashboard/approvals', () => HttpResponse.json({ items: [], total: 0 }));
export const quickFail = () => http.get('*/api/dashboard/approvals', () => problem(500, 'error.unknown'));
