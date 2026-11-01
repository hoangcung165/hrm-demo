// Search, contract type, state and page of the contract list, kept in the URL (`q`, `type`, `state`, `page`) so a reload
// or a link shows the same list. A value the list does not know is ignored, never sent to the API.
import { useUrlListQuery } from '@/lib/use-url-list-query';
import { CONTRACT_KINDS } from './contract-rules';
import { CONTRACT_LIST_STATES, type ContractListQuery } from './list-api';

const FILTERS = ['type', 'state'] as const;
/** The API refuses a page above this. */
const MAX_PAGE_INDEX = 10_000;

export function useContractListFilters() {
  const list = useUrlListQuery(FILTERS);
  const rawType = (list.params.get('type') ?? '').toUpperCase();
  const type = CONTRACT_KINDS.find((kind) => kind === rawType) ?? '';
  const rawState = list.params.get('state');
  const state = CONTRACT_LIST_STATES.find((item) => item === rawState) ?? '';
  const query: ContractListQuery = { q: list.q, type, state, page: Math.min(list.pageIndex, MAX_PAGE_INDEX) };
  return {
    query,
    /** The text of the search box, which runs ahead of `query.q` while typing. */
    search: list.search,
    setSearch: list.setSearch,
    filtered: Boolean(query.q || list.search.trim() || type || state),
    setType: (value: string) => list.setFilter('type', value),
    setState: (value: string) => list.setFilter('state', value),
    setPage: list.setPage,
    clear: list.clear,
  };
}

export type ContractListFilters = ReturnType<typeof useContractListFilters>;
