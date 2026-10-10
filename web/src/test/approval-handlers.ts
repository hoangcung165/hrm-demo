// MSW handlers for the approval inbox ("## API contract" comments on issue #14, BE-8 and BE-4) over the fixture
// rows: `box`, `type`, `q` on the sender's name or code without accents, `page` and `size`; the counts; the caller's
// delegations; one request.
import { http, HttpResponse } from 'msw';
import type { ApprovalBox, ApprovalDelegations, ApprovalInboxItem, ApprovalRequestDetail } from '@/features/approval/api';
import { problem } from './auth-handlers';
import { detailOf, profileUpdateOf } from './approval-detail-fixtures';
import { INBOX } from './approval-fixtures';

const plain = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, 'd').toLowerCase();

export type ApprovalApi = {
  handlers: Array<ReturnType<typeof http.get>>;
  /** The query string of every list request, in order. */
  requests: string[];
  /** Every decision posted: `approve <id> <comment>`. */
  decisions: string[];
};

export type ApprovalApiOptions = {
  inbox?: Record<ApprovalBox, ApprovalInboxItem[]>;
  delegations?: ApprovalDelegations;
  /** The list answers 500. */
  failList?: boolean;
  /** Decisions answer 409 `approval.already_handled`, as when someone acted first. */
  handledByOthers?: boolean;
};

export function approvalApi({ inbox = INBOX, delegations = { given: [], received: [] }, failList = false, handledByOthers = false }: ApprovalApiOptions = {}): ApprovalApi {
  const requests: string[] = [];
  const decisions: string[] = [];
  const all = Object.values(inbox).flat();
  const details = new Map<string, ApprovalRequestDetail>(all.map((row) => [row.id, detailOf(row)]));
  return {
    requests,
    decisions,
    handlers: [
      http.get('*/api/approvals/counts', () =>
        HttpResponse.json({ waiting: inbox.WAITING.length, sent: inbox.SENT.filter((r) => r.status === 'PENDING' || r.status === 'RETURNED_FOR_INFO').length }),
      ),
      http.get('*/api/approvals/:id', ({ params }) => {
        const found = details.get(String(params.id));
        return found ? HttpResponse.json(found) : problem(404, 'approval.not_found');
      }),
      http.post('*/api/approvals/:id/:decision', async ({ params, request }) => {
        const id = String(params.id);
        const found = details.get(id);
        if (!found) return problem(404, 'approval.not_found');
        const { comment = '' } = (await request.json()) as { comment?: string };
        decisions.push(`${params.decision} ${id} ${comment}`.trim());
        if (handledByOthers) {
          details.set(id, { ...found, status: 'APPROVED', allowed: { ...found.allowed, decide: false }, log: [...found.log, { event: 'APPROVED', level: found.level, actor: { id: 'e-28', code: 'NV00028', fullName: 'Trương Thị Ngọc Hân', orgUnitName: null }, onBehalfOf: null, comment: null, escalatedTo: null, at: new Date().toISOString() }] });
          return problem(409, 'approval.already_handled');
        }
        if (params.decision !== 'approve' && !comment) return problem(400, 'approval.reason_required');
        const last = found.level === found.levelCount;
        const status = params.decision === 'reject' ? 'REJECTED' : params.decision === 'return' ? 'RETURNED_FOR_INFO' : last ? 'APPROVED' : 'PENDING';
        const level = params.decision === 'approve' && !last ? found.level + 1 : found.level;
        const steps = found.steps.map((step) =>
          step.level === found.level
            ? { ...step, state: status === 'PENDING' || status === 'APPROVED' ? ('DONE' as const) : status === 'REJECTED' ? ('REJECTED' as const) : ('RETURNED' as const), comment: comment || null, decidedAt: new Date().toISOString() }
            : step.level === level && status === 'PENDING'
              ? { ...step, state: 'WAITING' as const, rule: 'ROLE' as const, role: 'HR' as const }
              : step,
        );
        const after = { ...found, status, level, steps, allowed: { ...found.allowed, decide: false } } as ApprovalRequestDetail;
        details.set(id, after);
        return HttpResponse.json(after);
      }),
      http.get('*/api/profile-update-requests/:id', ({ params }) => {
        const found = all.find((r) => r.id === params.id);
        return found ? HttpResponse.json(profileUpdateOf(found)) : problem(404, 'approval.not_found');
      }),
      http.get('*/api/approvals', ({ request }) => {
        const search = new URL(request.url).searchParams;
        requests.push(search.toString());
        if (failList) return problem(500, 'internal');
        const box = (search.get('box') ?? 'WAITING') as ApprovalBox;
        const page = Number(search.get('page') ?? 0);
        const size = Number(search.get('size') ?? 20);
        const q = plain(search.get('q') ?? '').trim();
        const type = search.get('type');
        const matching = (inbox[box] ?? []).filter(
          (r) => (!type || r.type === type) && (!q || plain(`${r.sender.fullName} ${r.sender.code}`).includes(q)),
        );
        return HttpResponse.json({ items: matching.slice(page * size, (page + 1) * size), total: matching.length });
      }),
      http.get('*/api/approval-delegations', () => HttpResponse.json(delegations)),
    ],
  };
}
