// Địa điểm chấm công API. Contract: BE-2 and BE-3 of HRM-39 (`/api/attendance/locations`, `/api/attendance/mobile-checkin-settings`).
// Every call needs `ATTENDANCE_LOCATION_EDIT`.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

/** Mirrors the backend record `AttendanceLocationResponse`. */
export type CheckinLocation = {
  id: string;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  active: boolean;
  /** Mobile punches of the last 30 days whose nearest place this was, inside the zone or not. */
  punchesLast30Days: number;
  createdAt: string;
  updatedAt: string;
};

/** Mirrors the backend record `AttendanceLocationRequest`. */
export type CheckinLocationRequest = Pick<CheckinLocation, 'name' | 'address' | 'latitude' | 'longitude' | 'radiusMeters'>;

/** The company-wide rules of the mobile check-in (read only on the page). */
export type CheckinRules = {
  maxAccuracyMeters: number;
  defaultMaxAccuracyMeters: number;
  /** The maximum was changed from its default. */
  customized: boolean;
  updatedAt: string | null;
  updatedByName: string | null;
  /** Fixed by the design: every Employee with an Account may check in. */
  everyEmployee: boolean;
  /** Fixed by the design: a front-camera photo comes with every punch. */
  photoRequired: boolean;
  /** Employees whose consent is in force. */
  consentCount: number;
};

export const LOCATIONS_KEY = ['attendance', 'locations'] as const;
export const RULES_KEY = ['attendance', 'mobile-checkin-settings'] as const;

/** Every place, by name, inactive ones included. */
export function useCheckinLocations() {
  return useQuery({ queryKey: LOCATIONS_KEY, queryFn: () => api<CheckinLocation[]>('/api/attendance/locations') });
}

export function useCheckinRules() {
  return useQuery({ queryKey: RULES_KEY, queryFn: () => api<CheckinRules>('/api/attendance/mobile-checkin-settings') });
}

/** Every change reloads the list. */
function useLocationMutation<TInput>(mutationFn: (input: TInput) => Promise<CheckinLocation>) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn, onSettled: () => queryClient.invalidateQueries({ queryKey: LOCATIONS_KEY }) });
}

export function useCreateLocation() {
  return useLocationMutation((body: CheckinLocationRequest) => api<CheckinLocation>('/api/attendance/locations', { method: 'POST', body }));
}

export function useUpdateLocation() {
  return useLocationMutation(({ id, body }: { id: string; body: CheckinLocationRequest }) =>
    api<CheckinLocation>(`/api/attendance/locations/${id}`, { method: 'PUT', body }),
  );
}

export function useDeactivateLocation() {
  return useLocationMutation((id: string) => api<CheckinLocation>(`/api/attendance/locations/${id}/deactivate`, { method: 'POST' }));
}

export function useReactivateLocation() {
  return useLocationMutation((id: string) => api<CheckinLocation>(`/api/attendance/locations/${id}/reactivate`, { method: 'POST' }));
}
