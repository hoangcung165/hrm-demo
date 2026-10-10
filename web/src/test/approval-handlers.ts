// MSW handlers for the approval inbox ("## API contract" comments on issue #14, BE-8 and BE-4) over the fixture
// rows: `box`, `type`, `q` on the sender's name or code without accents, `page` and `size`; the counts; the caller's
// delegations; one request.
import { http, HttpResponse } from 'msw';
import type { ApprovalBox, ApprovalDelegations, ApprovalInboxItem } from '@/features/approval/api';
import { problem } from './auth-handlers';
import { INBOX } from './approval-fixtures';

const plain = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, 'd').toLowerCase();

export type ApprovalApi = {
  handlers: ReturnType<typeof http.get>[];
  /** The query string of every list request, in order. */
  requests: string[];
};

export type ApprovalApiOptions = {
  inbox?: Record<ApprovalBox, ApprovalInboxItem[]>;
  delegations?: ApprovalDelegations;
  /** The list answers 500. */
  failList?: boolean;
};

export function approvalApi({ inbox = INBOX, delegations = { given: [], received: [] }, failList = false }: ApprovalApiOptions = {}): ApprovalApi {
  const requests: string[] = [];
  const all = Object.values(inbox).flat();
  return {
    requests,
    handlers: [
      http.get('*/api/approvals/counts', () =>
        HttpResponse.json({ waiting: inbox.WAITING.length, sent: inbox.SENT.filter((r) => r.status === 'PENDING' || r.status === 'RETURNED_FOR_INFO').length }),
      ),
      http.get('*/api/approvals/:id', ({ params }) => {
        const found = all.find((r) => r.id === params.id);
        return found ? HttpResponse.json(found) : problem(404, 'approval.not_found');
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
