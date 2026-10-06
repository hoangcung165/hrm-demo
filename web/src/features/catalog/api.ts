// Catalogs API (Danh mục). Contract: "## API contract" comment on issue #7.
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

/** The catalogs in tab order; each is its key in the API path and in `?catalog=`. */
export const CATALOGS = ['positions', 'contract-types', 'allowance-types', 'holidays', 'skills', 'project-roles'] as const;
export type CatalogKey = (typeof CATALOGS)[number];

export const CATALOG_STATUSES = ['ACTIVE', 'INACTIVE'] as const;
export type CatalogStatus = (typeof CATALOG_STATUSES)[number];

export type ContractTerm = 'INDEFINITE' | 'FIXED' | 'PROBATION';

/** Mirrors the backend record `CatalogItemResponse`: one shape for every catalog, the fields of other catalogs null. */
export type CatalogItem = {
  id: string;
  /** Null for holidays. */
  code: string | null;
  name: string;
  active: boolean;
  /** Another record refers to it: it can be deactivated, not deleted. */
  inUse: boolean;
  term: ContractTerm | null;
  maxMonths: number | null;
  insurable: boolean | null;
  taxable: boolean | null;
  /** ISO dates, both included. */
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CatalogPage = { items: CatalogItem[]; total: number };

export const CATALOG_PAGE_SIZE = 20;

/** `''` means no filter. `page` counts from 0, as the API does. `year` is for holidays only. */
export type CatalogListQuery = { page: number; q: string; status: CatalogStatus | ''; year: number | null };

export const CATALOGS_KEY = ['catalogs'] as const;

function itemsPath(catalog: CatalogKey, { page, q, status, year }: CatalogListQuery): string {
  const search = new URLSearchParams({ page: String(page), size: String(CATALOG_PAGE_SIZE) });
  if (q) search.set('q', q);
  if (status) search.set('status', status);
  if (year !== null) search.set('year', String(year));
  return `/api/catalogs/${catalog}/items?${search}`;
}

/**
 * One page of a catalog, by name (holidays by date). The rows of the previous query stay while the next one loads;
 * `pageIndex` says which page the rows in hand are.
 */
export function useCatalogItems(catalog: CatalogKey, query: CatalogListQuery) {
  return useQuery({
    queryKey: [...CATALOGS_KEY, catalog, query],
    queryFn: async () => ({ ...(await api<CatalogPage>(itemsPath(catalog, query))), pageIndex: query.page }),
    placeholderData: keepPreviousData,
  });
}

/** The years that have a holiday, ascending. */
export function useHolidayYears(enabled: boolean) {
  return useQuery({
    queryKey: [...CATALOGS_KEY, 'holidays', 'years'],
    queryFn: async () => (await api<{ years: number[] }>('/api/catalogs/holidays/years')).years,
    enabled,
  });
}

/** Mirrors the backend record `CatalogItemRequest`: the fields of other catalogs stay null. */
export type CatalogItemRequest = {
  code: string | null;
  name: string;
  term: ContractTerm | null;
  maxMonths: number | null;
  insurable: boolean | null;
  taxable: boolean | null;
  startDate: string | null;
  endDate: string | null;
};

/** Every change reloads the lists and the holiday years of all catalogs. */
function useCatalogMutation<TInput, TOutput = CatalogItem>(mutationFn: (input: TInput) => Promise<TOutput>) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn, onSettled: () => queryClient.invalidateQueries({ queryKey: CATALOGS_KEY }) });
}

export function useCreateCatalogItem(catalog: CatalogKey) {
  return useCatalogMutation((body: CatalogItemRequest) => api<CatalogItem>(`/api/catalogs/${catalog}/items`, { method: 'POST', body }));
}

export function useUpdateCatalogItem(catalog: CatalogKey) {
  return useCatalogMutation(({ id, body }: { id: string; body: CatalogItemRequest }) => api<CatalogItem>(`/api/catalogs/${catalog}/items/${id}`, { method: 'PUT', body }));
}

/** Which item: the catalog travels with the call, so an undo still reaches its catalog after a tab switch. */
export type CatalogItemRef = { catalog: CatalogKey; id: string };

/** No longer offered in pickers; records that use it keep it. Deactivating an inactive item answers 200. */
export function useDeactivateCatalogItem() {
  return useCatalogMutation(({ catalog, id }: CatalogItemRef) => api<CatalogItem>(`/api/catalogs/${catalog}/items/${id}/deactivate`, { method: 'POST' }));
}

export function useReactivateCatalogItem() {
  return useCatalogMutation(({ catalog, id }: CatalogItemRef) => api<CatalogItem>(`/api/catalogs/${catalog}/items/${id}/reactivate`, { method: 'POST' }));
}

/** Only an item no record uses; otherwise `catalog.item_in_use`. */
export function useDeleteCatalogItem() {
  return useCatalogMutation(async ({ catalog, id }: CatalogItemRef) => {
    await api<void>(`/api/catalogs/${catalog}/items/${id}`, { method: 'DELETE' });
  });
}
