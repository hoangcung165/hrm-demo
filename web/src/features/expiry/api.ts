import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
export type ExpiryAdvanceDays = Record<ExpiryType, number>;
export type ExpirySettings = { advanceDays: ExpiryAdvanceDays; canEdit: boolean };

export function useExpirySettings(enabled: boolean) {
  return useQuery({ queryKey: ['expiry-settings'], queryFn: () => api<ExpirySettings>('/api/expiry/settings'), enabled });
}

export function useSaveExpirySettings() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (advanceDays: ExpiryAdvanceDays) => api<ExpirySettings>('/api/expiry/settings', { method: 'PUT', body: { advanceDays } }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['expiry-settings'] });
      void client.invalidateQueries({ queryKey: ['upcoming-expiries'] });
    },
  });
}

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
