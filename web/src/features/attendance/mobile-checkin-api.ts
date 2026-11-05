// Mobile check-in API (HRM-39/BE-3): the Chấm công hôm nay card and the consent to the notice on location and photo
// (Decree 13/2023). For the caller's own Employee; an Account without an active Employee gets 403.
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { api, apiDownload, ApiError } from '@/lib/api';
import { readPosition, type DevicePosition } from '@/lib/device-position';
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

/** What the location chip says about a reading; nothing is stored. `location`: the nearest active place, null when there is none. */
export type CheckinLocate = {
  location: CheckinPlace | null;
  distanceMeters: number | null;
  outsideLocation: boolean;
  lowAccuracy: boolean;
  accuracyMeters: number;
  maxAccuracyMeters: number;
};

/** The reading the camera step sends along with the photo. */
export type CheckinReading = { position: DevicePosition; located: CheckinLocate };

const LOCATE_KEY = [...MOBILE_CHECKIN_KEY, 'locate'] as const;
const CONSENT_REQUIRED = 'mobile_checkin.consent_required';

/** A refusal for the consent (withdrawn or reworded while the camera was open): the page asks for it again. */
function askConsentAgain(queryClient: QueryClient, error: unknown) {
  if (error instanceof ApiError && error.status === 403 && error.code === CONSENT_REQUIRED) {
    void queryClient.invalidateQueries({ queryKey: CONSENT_KEY });
  }
}

/**
 * Reads the phone's position and asks the server which Địa điểm chấm công it is near. It runs when the camera step
 * opens (the Employee tapped "Chấm công vào/ra" to get here) and again on `refetch()`; a reading is never kept after
 * the step is left (`gcTime` 0), so an old position can never be sent. A refused or missing position rejects with a
 * `DeviceError`.
 */
export function useCheckinReading() {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: LOCATE_KEY,
    queryFn: async (): Promise<CheckinReading> => {
      const position = await readPosition();
      const query = new URLSearchParams({ latitude: String(position.latitude), longitude: String(position.longitude), accuracyMeters: String(position.accuracyMeters) });
      try {
        return { position, located: await api<CheckinLocate>(`/api/attendance/mobile-checkin/locate?${query}`) };
      } catch (error) {
        askConsentAgain(queryClient, error);
        throw error;
      }
    },
    retry: false,
    gcTime: 0,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

export type CheckinSend = { photo: Blob; position: DevicePosition };

/**
 * Sends one check-in: the photo and the reading, never a time (the server's clock decides). A failure stores nothing,
 * so the same photo and reading can be sent again. The card is read again after it is stored.
 */
export function useSendCheckin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ photo, position }: CheckinSend) => {
      const form = new FormData();
      form.append('photo', photo, 'checkin.jpg');
      form.append('latitude', String(position.latitude));
      form.append('longitude', String(position.longitude));
      form.append('accuracyMeters', String(position.accuracyMeters));
      return api<CheckinPunch>('/api/attendance/mobile-checkin', { method: 'POST', body: form });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TODAY_KEY }),
    onError: (error) => askConsentAgain(queryClient, error),
  });
}

/** The photo of one punch as an object URL for an `<img>`; each read is audited by the server, so it runs only when asked. */
export function usePunchPhoto(punchId: string, enabled: boolean) {
  return useQuery({
    queryKey: [...MOBILE_CHECKIN_KEY, 'photo', punchId],
    queryFn: async () => URL.createObjectURL((await apiDownload(`/api/attendance/punches/${punchId}/photo`)).blob),
    enabled,
    retry: false,
    gcTime: 0,
    staleTime: 0,
  });
}
