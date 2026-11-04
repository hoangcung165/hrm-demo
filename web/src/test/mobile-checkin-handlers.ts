// MSW handlers for mobile check-in (HRM-39). Contract: "## API contract: mobile check-in and consent (BE-3, #405)" on
// issue #392. The consent is kept between calls, so accepting or withdrawing shows on the next read.
import { delay, http, HttpResponse } from 'msw';
import type { CheckinConsent, CheckinPunch, CheckinToday } from '@/features/attendance/mobile-checkin-api';
import { problem } from './auth-handlers';

export const NOT_ACCEPTED: CheckinConsent = { accepted: false, acceptedAt: null, withdrawnAt: null, noticeVersion: null, currentNoticeVersion: 1 };
export const ACCEPTED: CheckinConsent = { accepted: true, acceptedAt: '2026-11-02T02:15:00Z', withdrawnAt: null, noticeVersion: 1, currentNoticeVersion: 1 };
export const WITHDRAWN: CheckinConsent = { ...ACCEPTED, accepted: false, withdrawnAt: '2026-11-03T09:40:00Z' };

export const OFFICE_SHIFT = { id: 'sh-hc', code: 'HC', name: 'Hành chính', startTime: '08:00', endTime: '17:00', crossesMidnight: false, active: true };
const OFFICE = { id: 'loc-1', name: 'Văn phòng chính', radiusMeters: 150 };

/** A phone punch at Văn phòng chính; `outside` is 1,2 km away. */
export const mobilePunch = (id: string, at: string, { outside = false, lowAccuracy = false } = {}): CheckinPunch => ({
  id, at, source: 'MOBILE', location: OFFICE, distanceMeters: outside ? 1_200 : 35, accuracyMeters: lowAccuracy ? 180 : 12,
  outsideLocation: outside, lowAccuracy, hasPhoto: true,
});
export const machinePunch = (id: string, at: string): CheckinPunch => ({
  id, at, source: 'MACHINE', location: null, distanceMeters: null, accuracyMeters: null, outsideLocation: false, lowAccuracy: false, hasPhoto: false,
});

export const todayOf = (consent: CheckinConsent, punches: CheckinPunch[] = [], overrides: Partial<CheckinToday> = {}): CheckinToday => ({
  date: '2026-11-04', consent, shift: OFFICE_SHIFT, punches, nextLabel: punches.length === 0 ? 'IN' : 'OUT', maxAccuracyMeters: 100, ...overrides,
});

export type CheckinApiOptions = {
  consent?: CheckinConsent;
  punches?: CheckinPunch[];
  today?: Partial<CheckinToday>;
  /** 403 for both reads: an Account whose Employee cannot check in. */
  forbidden?: boolean;
  failToday?: boolean;
  failConsent?: boolean;
  /** POST answers 400 `noticeVersion outdated` once, with this wording now current. */
  outdatedTo?: number;
  failAccept?: boolean;
  failWithdraw?: boolean;
  /** Milliseconds every write waits, to see the pending state. */
  writeDelay?: number;
};

/** `accepts` holds the bodies of the POSTs; `withdrawals` counts the DELETEs. */
export function checkinApi({ consent: initial = NOT_ACCEPTED, punches = [], today = {}, forbidden = false, failToday = false, failConsent = false, outdatedTo, failAccept = false, failWithdraw = false, writeDelay = 0 }: CheckinApiOptions = {}) {
  let consent = initial;
  let outdated = outdatedTo;
  const accepts: unknown[] = [];
  let withdrawals = 0;
  const handlers = [
    http.get('*/api/attendance/mobile-checkin', () => {
      if (forbidden) return problem(403, 'mobile_checkin.no_employee');
      if (failToday) return problem(500, 'error.unknown');
      return HttpResponse.json(todayOf(consent, punches, today));
    }),
    http.get('*/api/attendance/mobile-checkin/consent', () => {
      if (forbidden) return problem(403, 'mobile_checkin.no_employee');
      if (failConsent) return problem(500, 'error.unknown');
      return HttpResponse.json(consent);
    }),
    http.post('*/api/attendance/mobile-checkin/consent', async ({ request }) => {
      const body = (await request.json()) as { noticeVersion: number };
      accepts.push(body);
      await delay(writeDelay);
      if (failAccept) return problem(500, 'error.unknown');
      if (outdated !== undefined) {
        consent = { ...consent, currentNoticeVersion: outdated };
        outdated = undefined;
        return problem(400, 'validation.invalid', { errors: [{ field: 'noticeVersion', code: 'outdated' }] });
      }
      consent = { accepted: true, acceptedAt: '2026-11-04T01:05:00Z', withdrawnAt: null, noticeVersion: body.noticeVersion, currentNoticeVersion: consent.currentNoticeVersion };
      return HttpResponse.json(consent);
    }),
    http.delete('*/api/attendance/mobile-checkin/consent', async () => {
      withdrawals += 1;
      await delay(writeDelay);
      if (failWithdraw) return problem(500, 'error.unknown');
      consent = { ...consent, accepted: false, withdrawnAt: '2026-11-04T03:00:00Z' };
      return HttpResponse.json(consent);
    }),
  ];
  return { handlers, accepts, withdrawals: () => withdrawals, consent: () => consent };
}

/** What every test gets unless it says otherwise: the consent not given yet, no punch today. Reads only, no state. */
export const checkinDefaults = () => [
  http.get('*/api/attendance/mobile-checkin', () => HttpResponse.json(todayOf(NOT_ACCEPTED))),
  http.get('*/api/attendance/mobile-checkin/consent', () => HttpResponse.json(NOT_ACCEPTED)),
];
