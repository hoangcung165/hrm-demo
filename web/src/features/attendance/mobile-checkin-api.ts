// Mobile check-in API (HRM-39/BE-3): the Chấm công hôm nay card and the consent to the notice on location and photo
// (Decree 13/2023). For the caller's own Employee; an Account without an active Employee gets 403.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { DailyShift } from './daily-api';

/** `accepted`: accepted, not withdrawn, and of the current wording. Instants are ISO strings. */
export type CheckinConsent = {
  accepted: boolean;
  acceptedAt: string | null;
  withdrawnAt: string | null;
  noticeVersion: number | null;
  currentNoticeVersion: number;
};

export type CheckinPlace = { id: string; name: string; radiusMeters: number };

export type PunchSource = 'MACHINE' | 'MOBILE';

/** One Lần quẹt of the caller; a machine punch has no place, distance, accuracy or photo. `at` carries +07:00. */
export type CheckinPunch = {
  id: string;
  at: string;
  source: PunchSource;
  location: CheckinPlace | null;
  distanceMeters: number | null;
  accuracyMeters: number | null;
  outsideLocation: boolean;
  lowAccuracy: boolean;
  hasPhoto: boolean;
};

/** `date`: today, or yesterday while yesterday's night shift is still open. `nextLabel` names the button only. */
export type CheckinToday = {
  date: string;
  consent: CheckinConsent;
  shift: DailyShift | null;
  punches: CheckinPunch[];
  nextLabel: 'IN' | 'OUT';
  maxAccuracyMeters: number;
};

export const MOBILE_CHECKIN_KEY = ['attendance', 'mobile-checkin'] as const;
const TODAY_KEY = [...MOBILE_CHECKIN_KEY, 'today'] as const;
const CONSENT_KEY = [...MOBILE_CHECKIN_KEY, 'consent'] as const;
const CONSENT_PATH = '/api/attendance/mobile-checkin/consent';

/** The Chấm công hôm nay card. A 403 (no active Employee) is an answer, not something to retry. */
export function useCheckinToday() {
  return useQuery({
    queryKey: TODAY_KEY,
    queryFn: () => api<CheckinToday>('/api/attendance/mobile-checkin'),
    retry: false,
  });
}

export function useCheckinConsent() {
  return useQuery({ queryKey: CONSENT_KEY, queryFn: () => api<CheckinConsent>(CONSENT_PATH), retry: false });
}

/** Accepting or withdrawing changes the card too: both are written to the cache, the card is read again. */
function useConsentMutation<TInput>(mutationFn: (input: TInput) => Promise<CheckinConsent>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (consent) => {
      queryClient.setQueryData(CONSENT_KEY, consent);
      queryClient.setQueryData<CheckinToday>(TODAY_KEY, (today) => (today ? { ...today, consent } : today));
      void queryClient.invalidateQueries({ queryKey: TODAY_KEY });
    },
  });
}

/** Accepts the wording the screen showed; 400 `outdated` when it changed meanwhile. */
export function useAcceptCheckinConsent() {
  return useConsentMutation((noticeVersion: number) => api<CheckinConsent>(CONSENT_PATH, { method: 'POST', body: { noticeVersion } }));
}

/** Withdraws: check-in is then refused until the notice is accepted again. */
export function useWithdrawCheckinConsent() {
  return useConsentMutation(() => api<CheckinConsent>(CONSENT_PATH, { method: 'DELETE' }));
}
