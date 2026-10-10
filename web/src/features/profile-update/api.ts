// Cập nhật hồ sơ requests (HRM-12/BE-7). Contract: "## API contract: profile update requests (BE-7)" on issue #14.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { APPROVALS_KEY, useApprovalInbox, type ApprovalStatus } from '@/features/approval/api';
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

/** Mirrors the backend record `ProfileUpdateSubmitRequest`: every contact field as wanted, null clears one. */
export type ProfileUpdateInput = {
  personalEmail: string | null;
  phone: string | null;
  address: string | null;
  emergencyContact: { name: string | null; relationship: string | null; phone: string | null } | null;
  note: string | null;
};

/** Sends a new request, or (with `id`) changes a returned one and sends it again at the same level. */
export function useSendProfileUpdate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: ProfileUpdateInput }) =>
      api<ProfileUpdate>(id ? `/api/profile-update-requests/${id}` : '/api/profile-update-requests', { method: id ? 'PUT' : 'POST', body: input }),
    onSuccess: (saved) => {
      queryClient.setQueryData(profileUpdateKey(saved.id), saved);
      void queryClient.invalidateQueries({ queryKey: APPROVALS_KEY });
    },
  });
}

/** The caller's profile update still open (waiting or returned), from "Tôi đã gửi"; null when there is none. */
export function useOpenProfileUpdate(enabled: boolean) {
  const sent = useApprovalInbox({ box: 'SENT', page: 0, q: '', type: 'PROFILE_UPDATE' }, enabled);
  return sent.data?.items.find((item) => item.status === 'PENDING' || item.status === 'RETURNED_FOR_INFO') ?? null;
}
