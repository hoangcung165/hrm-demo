import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export const EXPIRY_TYPES = ['CONTRACT', 'PROBATION', 'VISA', 'WORK_PERMIT', 'CERTIFICATE'] as const;
export type ExpiryType = (typeof EXPIRY_TYPES)[number];

export type UpcomingExpiryItem = {
  type: ExpiryType;
  sourceId: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  sourceName: string | null;
  expiresOn: string;
  daysRemaining: number;
  sourcePath: string;
};

export type UpcomingExpiries = { items: UpcomingExpiryItem[]; total: number; page: number; size: number; asOf: string };
export type ExpiryQuery = { type: ExpiryType | ''; from: string; to: string; page: number };
export const EXPIRY_PAGE_SIZE = 20;

export function useUpcomingExpiries(query: ExpiryQuery, enabled: boolean) {
  return useQuery({
    queryKey: ['upcoming-expiries', query],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(query.page), size: String(EXPIRY_PAGE_SIZE) });
      if (query.type) params.set('type', query.type);
      if (query.from) params.set('from', query.from);
      if (query.to) params.set('to', query.to);
      return api<UpcomingExpiries>(`/api/expiry?${params}`);
    },
    placeholderData: keepPreviousData,
    enabled,
  });
}
