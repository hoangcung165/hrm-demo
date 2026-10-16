// Search, filters and page of the Audit log live in the URL (`q`, `type`, `actor`, `from`, `to`, `page`), so a filtered
// view survives a reload and can be linked. Values the API would refuse are ignored rather than sent.
import { useUrlListQuery } from '@/lib/use-url-list-query';
import type { AuditLogQuery } from './api';

const FILTERS = ['type', 'actor', 'from', 'to'] as const;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TYPE = /^[A-Z][A-Z0-9_]*$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

const valid = (pattern: RegExp, value: string | null) => (value && pattern.test(value) ? value : '');

export function useAuditFilters() {
  const list = useUrlListQuery(FILTERS);
  const entityType = valid(TYPE, list.params.get('type'));
  const actorId = valid(UUID, list.params.get('actor'));
  let from = valid(DAY, list.params.get('from'));
  let to = valid(DAY, list.params.get('to'));
  // The API refuses a range that ends before it starts; read it the way round it was meant.
  if (from && to && to < from) [from, to] = [to, from];
  const query: AuditLogQuery = { page: list.pageIndex, q: list.q, entityType, actorId, from, to };
  /** Filters that are set; the search is not counted. */
  const activeCount = [entityType, actorId, from || to].filter(Boolean).length;
  return {
    query,
    activeCount,
    search: list.search,
    setSearch: list.setSearch,
    setEntityType: (key: string) => list.setFilter('type', key),
    setActor: (id: string) => list.setFilter('actor', id),
    /** Both ends at once; `''` drops an end. */
    setPeriod: (start: string, end: string) => list.setFilters({ from: start, to: end }),
    setPage: list.setPage,
    /** A search or any filter: "Xóa bộ lọc" is offered and an empty list means "no match". */
    filtered: Boolean(list.q || list.search.trim() || activeCount > 0),
    clear: list.clear,
  };
}

export type AuditFilters = ReturnType<typeof useAuditFilters>;
