// "Sắp hết hạn" block: the first rows of GET /api/expiry. The window is not sent: the API applies the warning days of
// each type from the settings (HRM-14), so the block shows what the list on /expiry shows, soonest first.
import { useQuery } from '@tanstack/react-query';
import type { UpcomingExpiries } from '@/features/expiry/api';
import { api } from '@/lib/api';

/** A block holds at most five rows; the total in its head and the link to /expiry are for the rest. */
export const DASHBOARD_EXPIRY_ROWS = 5;

/** The key starts with `upcoming-expiries`, so saving the settings refreshes the block as it does the list. */
export function useDashboardExpiry(enabled: boolean) {
  return useQuery({
    queryKey: ['upcoming-expiries', 'dashboard'],
    queryFn: () => api<UpcomingExpiries>(`/api/expiry?${new URLSearchParams({ page: '0', size: String(DASHBOARD_EXPIRY_ROWS) })}`),
    enabled,
  });
}
