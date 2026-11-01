// HRM-38/FE-1: the company-wide contract list. DTOs mirror ContractListResponse and ContractListItem in the backend;
// contract: "## API contract: contract list" on #382. Terms only: the list never carries salary data.
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ContractKind } from './contract-rules';

/** Where a contract stands on the company date (inclusive terms; EXPIRING ends within 30 days). */
export const CONTRACT_LIST_STATES = ['UPCOMING', 'CURRENT', 'EXPIRING', 'ENDED'] as const;
export type ContractListState = (typeof CONTRACT_LIST_STATES)[number];

export type ContractListItem = {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  contractNumber: string;
  contractType: string;
  startsOn: string;
  /** Null for an open-ended contract. */
  endsOn: string | null;
  state: ContractListState;
  /** Set only for a running contract with an end date. */
  daysRemaining: number | null;
};

export type ContractList = { items: ContractListItem[]; total: number; page: number; size: number; asOf: string };

export type ContractListQuery = { q: string; type: ContractKind | ''; state: ContractListState | ''; page: number };

export const CONTRACT_LIST_PAGE_SIZE = 20;

export function useContractList(query: ContractListQuery, enabled: boolean) {
  return useQuery({
    queryKey: ['contract-list', query],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(query.page), size: String(CONTRACT_LIST_PAGE_SIZE) });
      if (query.q) params.set('search', query.q);
      if (query.type) params.set('type', query.type);
      if (query.state) params.set('state', query.state);
      return api<ContractList>(`/api/contracts?${params}`);
    },
    placeholderData: keepPreviousData,
    enabled,
  });
}
