// Tab, search, request type, "Duyệt với tư cách" and page of the Hộp thư duyệt live in the URL (`box`, `q`, `type`,
// `as`, `page`), so they survive a reload and can be linked. Defaults stay out of the URL: "Chờ tôi duyệt", every
// request type, mine and on behalf. The tab "Ủy quyền duyệt" is `box=delegations` and has no list query.
import { useSearchParams } from 'react-router';
import { useUrlListQuery } from '@/lib/use-url-list-query';
import { APPROVAL_REQUEST_TYPES, type ApprovalBox, type ApprovalInboxQuery, type ApprovalOnBehalf, type ApprovalRequestType } from './api';

export const INBOX_TABS = ['WAITING', 'SENT', 'HANDLED', 'DELEGATIONS'] as const;
export type InboxTab = (typeof INBOX_TABS)[number];

const FILTERS = ['type', 'as'] as const;
const TAB_PARAM: Record<InboxTab, string> = { WAITING: '', SENT: 'sent', HANDLED: 'handled', DELEGATIONS: 'delegations' };
const AS_PARAM: Record<Exclude<ApprovalOnBehalf, ''>, string> = { MINE: 'mine', BEHALF: 'behalf' };

const tabOf = (value: string | null): InboxTab => INBOX_TABS.find((tab) => value && TAB_PARAM[tab] === value) ?? 'WAITING';
const typeOf = (value: string | null): ApprovalRequestType | '' => (APPROVAL_REQUEST_TYPES.includes(value as ApprovalRequestType) ? (value as ApprovalRequestType) : '');
const asOf = (value: string | null): ApprovalOnBehalf => (value === 'mine' ? 'MINE' : value === 'behalf' ? 'BEHALF' : '');

export function useApprovalFilters() {
  const list = useUrlListQuery(FILTERS);
  const [, setParams] = useSearchParams();
  const tab = tabOf(list.params.get('box'));
  const type = typeOf(list.params.get('type'));
  const onBehalf = asOf(list.params.get('as'));
  const box: ApprovalBox = tab === 'DELEGATIONS' ? 'WAITING' : tab;
  const query: ApprovalInboxQuery = { box, page: list.pageIndex, q: list.q, type, onBehalf: box === 'WAITING' ? onBehalf : '' };
  /** Another tab, on its first page; the search and the type stay. */
  const setTab = (value: InboxTab) =>
    setParams((current) => {
      const next = new URLSearchParams(current);
      next.delete('page');
      if (TAB_PARAM[value]) next.set('box', TAB_PARAM[value]);
      else next.delete('box');
      return next;
    });
  return {
    tab,
    query,
    search: list.search,
    setSearch: list.setSearch,
    setTab,
    setBox: (value: ApprovalBox) => setTab(value),
    setType: (value: ApprovalRequestType | '') => list.setFilter('type', value),
    setOnBehalf: (value: ApprovalOnBehalf) => list.setFilter('as', value ? AS_PARAM[value] : ''),
    setPage: list.setPage,
    /** A search, a request type or "Duyệt với tư cách" is set: "Xóa bộ lọc" is offered. */
    filtered: list.filtered,
    /** Clears the search and the filters; the tab stays. */
    clear: list.clear,
  };
}

export type ApprovalFilters = ReturnType<typeof useApprovalFilters>;
