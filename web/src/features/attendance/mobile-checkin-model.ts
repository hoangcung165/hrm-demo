// What the Chấm công hôm nay card says about the day. "Vào" and "Ra" are labels only: the Bộ xử lý chấm công still
// decides In and Out from the Khung ca, as for machine punches (HRM-39, decision 8).
import type { CheckinPunch, CheckinToday } from './mobile-checkin-api';

/** Nothing yet, checked in, or checked in and out at least once. */
export type CheckinStatus = 'none' | 'in' | 'out';

export function checkinStatus(today: Pick<CheckinToday, 'punches'>): CheckinStatus {
  if (today.punches.length === 0) return 'none';
  return today.punches.length === 1 ? 'in' : 'out';
}

/** The first punch of the day reads "Vào", every later one "Ra" (the latest Ra is the one that counts). */
export function punchLabel(index: number): 'IN' | 'OUT' {
  return index === 0 ? 'IN' : 'OUT';
}

/** Where a punch was: the place and how far, or nothing for a machine punch. `outside`: beyond the place's radius. */
export type PunchWhere = { place: string; distanceMeters: number | null; outside: boolean } | null;

export function punchWhere(punch: CheckinPunch): PunchWhere {
  if (punch.source !== 'MOBILE') return null;
  return { place: punch.location?.name ?? '', distanceMeters: punch.distanceMeters, outside: punch.outsideLocation };
}

/** A mobile punch outside every place or with a poor reading: the manager reviews it. */
export function needsReview(punches: CheckinPunch[]): boolean {
  return punches.some((punch) => punch.source === 'MOBILE' && (punch.outsideLocation || punch.lowAccuracy));
}
