// Where a request sits in the caller's "Chờ tôi duyệt" (first page, soonest auto-approve first): "Yêu cầu 1 / 6", the
// previous and next requests, and the one to open after a decision. Null when the request is not waiting for them.
import { useApprovalInbox, type ApprovalInboxItem } from './api';

export type WaitingNeighbours = {
  /** From 1. */
  index: number;
  total: number;
  previous: ApprovalInboxItem | null;
  next: ApprovalInboxItem | null;
};

export function useWaitingNeighbours(id: string): WaitingNeighbours | null {
  const waiting = useApprovalInbox({ box: 'WAITING', page: 0, q: '', type: '' });
  const items = waiting.data?.items ?? [];
  const at = items.findIndex((item) => item.id === id);
  if (at < 0) return null;
  return { index: at + 1, total: waiting.data!.total, previous: items[at - 1] ?? null, next: items[at + 1] ?? null };
}
