import { formatHours, mapUrl, marksOf, rangeLength, stepRange, weekOf } from './daily-model';
import type { DailyDay } from './daily-api';

const day = (over: Partial<DailyDay> = {}): DailyDay => ({
  date: '2026-10-13', shiftId: 's', in: null, out: null, workedMinutes: 0, lateMinutes: 0, earlyLeaveMinutes: 0, flags: [], holiday: null, leave: null, noLog: false, inSource: null, outSource: null, manual: null, inPunchSource: null, outPunchSource: null, ...over,
});

describe('daily model', () => {
  it('finds the Monday-to-Sunday week of a day', () => {
    const week = weekOf(new Date(2026, 9, 14));
    expect([week.from.getDate(), week.to.getDate()]).toEqual([12, 18]);
  });

  it('steps a range by its own length', () => {
    expect(stepRange('2026-10-12', '2026-10-18', 1)).toEqual({ from: '2026-10-19', to: '2026-10-25' });
    expect(stepRange('2026-10-12', '2026-10-14', -1)).toEqual({ from: '2026-10-09', to: '2026-10-11' });
    expect(rangeLength('2026-08-01', '2026-10-22')).toBe(83);
  });

  it('writes minutes as h:mm', () => {
    expect([formatHours(445), formatHours(480), formatHours(5)]).toEqual(['7:25', '8:00', '0:05']);
  });

  it('lists the abnormal marks first and keeps the informational ones out of the abnormal set', () => {
    const marks = marksOf(day({ lateMinutes: 17, flags: ['DUPLICATE_PUNCH', 'MISSING_OUT'] }));
    expect(marks.map((mark) => mark.key)).toEqual(['late', 'missingOut', 'duplicate']);
    expect(marks.filter((mark) => mark.abnormal).map((mark) => mark.key)).toEqual(['late', 'missingOut']);
  });

  it('says only "no log yet" for a day the log does not cover, and names a half-day leave', () => {
    expect(marksOf(day({ noLog: true })).map((mark) => mark.key)).toEqual(['noLog']);
    // Công thủ công decides the day and reads first, never as abnormal.
    expect(marksOf(day({ manual: 'HALF' })).map((mark) => [mark.key, mark.abnormal])).toEqual([['manual.HALF', false]]);
    expect(marksOf(day({ manual: 'ABSENT', flags: ['ABSENT'] })).map((mark) => mark.key)).toEqual(['manual.ABSENT', 'absent']);
    expect(marksOf(day({ flags: ['LEAVE'], leave: 'AFTERNOON' })).map((mark) => mark.key)).toEqual(['leaveAfternoon']);
  });

  it('shows nothing for a day in order', () => {
    expect(marksOf(day({ in: 'x', out: 'y', workedMinutes: 480 }))).toEqual([]);
  });

  it('marks a phone punch outside its zone or poorly read as review-only warnings', () => {
    const marks = marksOf(day({ flags: ['OUTSIDE_LOCATION', 'LOW_ACCURACY'] }));
    expect(marks.map((mark) => [mark.key, mark.tone, mark.abnormal])).toEqual([
      ['outsideLocation', 'warning', true],
      ['lowAccuracy', 'warning', true],
    ]);
  });

  it('builds a map link from a position', () => {
    expect(mapUrl(21.031, 105.789)).toBe('https://www.google.com/maps/search/?api=1&query=21.031,105.789');
  });
});
