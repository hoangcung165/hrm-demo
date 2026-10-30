// The caller's leave requests that still need something this year: waiting for a decision, or returned to them.
import { useMyLeaveRequests, type LeaveRequestListItem } from '@/features/leave/api';
import { companyToday } from '@/lib/company-time';

export const isOpenRequest = (item: LeaveRequestListItem) => item.status === 'PENDING' || item.status === 'RETURNED';

/** The latest page of "Đơn của tôi" for this year (the one `/leave` opens on), reduced to the open requests. */
export function useOpenRequests() {
  const query = useMyLeaveRequests(companyToday().getFullYear(), 0);
  const open = (query.data?.items ?? []).filter(isOpenRequest);
  return { query, open };
}
