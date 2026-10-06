// Search, status, year (holidays) and page of a catalog list live in the URL beside the tab (`?catalog=`), so they
// survive a reload and can be linked. A holiday list without a year shows the current year.
import { useUrlListQuery } from '@/lib/use-url-list-query';
import { CATALOG_STATUSES, type CatalogKey, type CatalogListQuery, type CatalogStatus } from './api';

const FILTERS = ['status', 'year'] as const;

export function useCatalogFilters(catalog: CatalogKey, today: Date = new Date()) {
  const list = useUrlListQuery(FILTERS);
  const rawStatus = list.params.get('status');
  const status: CatalogStatus | '' = CATALOG_STATUSES.includes(rawStatus as CatalogStatus) ? (rawStatus as CatalogStatus) : '';
  const currentYear = today.getFullYear();
  const rawYear = Number(list.params.get('year'));
  const year = catalog === 'holidays' ? (Number.isInteger(rawYear) && rawYear >= 1900 && rawYear <= 9999 ? rawYear : currentYear) : null;
  const query: CatalogListQuery = { page: list.pageIndex, q: list.q, status, year };
  return {
    query,
    currentYear,
    search: list.search,
    setSearch: list.setSearch,
    setStatus: (value: CatalogStatus | '') => list.setFilter('status', value),
    /** The current year is the default and is kept out of the URL. */
    setYear: (value: number) => list.setFilter('year', value === currentYear ? '' : String(value)),
    setPage: list.setPage,
    filtered: Boolean(list.q || status || list.search.trim()),
    clear: list.clear,
  };
}
