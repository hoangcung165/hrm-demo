import { machinePunch, mobilePunch } from '@/test/mobile-checkin-handlers';
import { checkinStatus, needsReview, punchLabel, punchWhere } from './mobile-checkin-model';

describe('mobile check-in model', () => {
  it('names the day by its punches: none, checked in, checked out', () => {
    expect(checkinStatus({ punches: [] })).toBe('none');
    expect(checkinStatus({ punches: [mobilePunch('p1', '2026-11-04T08:02:00+07:00')] })).toBe('in');
    expect(checkinStatus({ punches: [mobilePunch('p1', '2026-11-04T08:02:00+07:00'), machinePunch('p2', '2026-11-04T17:05:00+07:00')] })).toBe('out');
  });

  it('labels the first punch In and every later one Out', () => {
    expect([0, 1, 2].map(punchLabel)).toEqual(['IN', 'OUT', 'OUT']);
  });

  it('says where a phone punch was, and nothing for a machine punch', () => {
    expect(punchWhere(mobilePunch('p1', '2026-11-04T08:02:00+07:00'))).toEqual({ place: 'Văn phòng chính', distanceMeters: 35, outside: false });
    expect(punchWhere(mobilePunch('p1', '2026-11-04T08:02:00+07:00', { outside: true }))).toEqual({ place: 'Văn phòng chính', distanceMeters: 1200, outside: true });
    expect(punchWhere(machinePunch('p2', '2026-11-04T08:02:00+07:00'))).toBeNull();
  });

  it('asks for a review when a phone punch is outside the zone or with a poor reading', () => {
    expect(needsReview([mobilePunch('p1', '2026-11-04T08:02:00+07:00')])).toBe(false);
    expect(needsReview([mobilePunch('p1', '2026-11-04T08:02:00+07:00', { outside: true })])).toBe(true);
    expect(needsReview([mobilePunch('p1', '2026-11-04T08:02:00+07:00', { lowAccuracy: true })])).toBe(true);
    expect(needsReview([machinePunch('p2', '2026-11-04T08:02:00+07:00')])).toBe(false);
  });
});
