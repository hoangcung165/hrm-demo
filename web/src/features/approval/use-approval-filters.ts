// Tab, search, request type and page of the Hộp thư duyệt live in the URL (`box`, `q`, `type`, `page`), so they
// survive a reload and can be linked. Defaults stay out of the URL: "Chờ tôi duyệt", every request type.
import { useSearchParams } from 'react-router';
import { useUrlListQuery } from '@/lib/use-url-list-query';
import { APPROVAL_BOXES, APPROVAL_REQUEST_TYPES, type ApprovalBox, type ApprovalInboxQuery, type ApprovalRequestType } from './api';

const FILTERS = ['type'] as const;
const BOX_PARAM: Record<ApprovalBox, string> = { WAITING: '', SENT: 'sent', HANDLED: 'handled' };

const boxOf = (value: string | null): ApprovalBox => APPROVAL_BOXES.find((box) => value && BOX_PARAM[box] === value) ?? 'WAITING';
const typeOf = (value: string | null): ApprovalRequestType | '' => (APPROVAL_REQUEST_TYPES.includes(value as ApprovalRequestType) ? (value as ApprovalRequestType) : '');

export function useApprovalFilters() {
  const list = useUrlListQuery(FILTERS);
  const [, setParams] = useSearchParams();
  const box = boxOf(list.params.get('box'));
  const type = typeOf(list.params.get('type'));
  const query: ApprovalInboxQuery = { box, page: list.pageIndex, q: list.q, type };
  return {
    query,
    search: list.search,
    setSearch: list.setSearch,
    /** Another tab, on its first page; the search and the type stay. */
    setBox: (value: ApprovalBox) =>
      setParams((current) => {
        const next = new URLSearchParams(current);
        next.delete('page');
        if (BOX_PARAM[value]) next.set('box', BOX_PARAM[value]);
        else next.delete('box');
        return next;
      }),
    setType: (value: ApprovalRequestType | '') => list.setFilter('type', value),
    setPage: list.setPage,
    /** A search or a request type is set: "Xóa bộ lọc" is offered. */
    filtered: list.filtered,
    /** Clears the search and the type; the tab stays. */
    clear: list.clear,
  };
}

export type ApprovalFilters = ReturnType<typeof useApprovalFilters>;
