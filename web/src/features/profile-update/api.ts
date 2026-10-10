// Cập nhật hồ sơ requests (HRM-12/BE-7). Contract: "## API contract: profile update requests (BE-7)" on issue #14.
import { useQuery } from '@tanstack/react-query';
import type { ApprovalStatus } from '@/features/approval/api';
import { api } from '@/lib/api';

export const CONTACT_FIELDS = ['PERSONAL_EMAIL', 'PHONE', 'ADDRESS', 'EMERGENCY_CONTACT_NAME', 'EMERGENCY_CONTACT_RELATIONSHIP', 'EMERGENCY_CONTACT_PHONE'] as const;
export type ContactField = (typeof CONTACT_FIELDS)[number];

/** Mirrors the backend record `ProfileUpdateChange`. `oldValue` is the profile's value when the request was sent. */
export type ProfileUpdateChange = { field: ContactField; oldValue: string | null; newValue: string | null };

/** Mirrors the backend record `ProfileUpdateResponse`; `id` is the approval request's. */
export type ProfileUpdate = { id: string; status: ApprovalStatus; employeeId: string; note: string | null; changes: ProfileUpdateChange[] };

export const profileUpdateKey = (id: string) => ['profile-updates', id] as const;

/** The proposed changes of a profile update request, for whoever may open the request. */
export function useProfileUpdate(id: string, enabled = true) {
  return useQuery({ queryKey: profileUpdateKey(id), queryFn: () => api<ProfileUpdate>(`/api/profile-update-requests/${id}`), enabled });
}
