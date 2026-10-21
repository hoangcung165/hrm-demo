import { normalizeTime, shiftLength, toMinutes } from './duration';

const times = (startTime: string, endTime: string, breakStart = '', breakEnd = '') => ({ startTime, endTime, breakStart, breakEnd });

describe('shiftLength', () => {
  it('takes the break off a day shift and counts no night hours', () => {
    expect(shiftLength(times('08:00', '17:00', '12:00', '13:00'))).toEqual({ crossesMidnight: false, scheduledMinutes: 480, nightMinutes: 0 });
  });

  it('counts a night shift across midnight as all night hours', () => {
    expect(shiftLength(times('22:00', '06:00'))).toEqual({ crossesMidnight: true, scheduledMinutes: 480, nightMinutes: 480 });
  });

  it('counts only the minutes between 22:00 and 06:00, and leaves the break out', () => {
    expect(shiftLength(times('18:00', '02:00'))).toEqual({ crossesMidnight: true, scheduledMinutes: 480, nightMinutes: 240 });
    expect(shiftLength(times('18:00', '02:00', '23:00', '00:00'))).toEqual({ crossesMidnight: true, scheduledMinutes: 420, nightMinutes: 180 });
    expect(shiftLength(times('04:00', '12:00'))).toEqual({ crossesMidnight: false, scheduledMinutes: 480, nightMinutes: 120 });
  });

  it('is empty while the times cannot make a shift', () => {
    expect(shiftLength(times('', '17:00'))).toBeNull();
    expect(shiftLength(times('08:00', '08:00'))).toBeNull();
    expect(shiftLength(times('08:00', '17:00', '12:00', ''))).toBeNull();
    expect(shiftLength(times('08:00', '17:00', '13:00', '12:00'))).toBeNull();
    expect(shiftLength(times('08:00', '17:00', '16:00', '18:00'))).toBeNull();
    expect(shiftLength(times('25:00', '17:00'))).toBeNull();
  });
});

describe('normalizeTime and toMinutes', () => {
  it('pads a single-digit hour and leaves anything else as typed', () => {
    expect(normalizeTime(' 6:00 ')).toBe('06:00');
    expect(normalizeTime('22:30')).toBe('22:30');
    expect(normalizeTime('abc')).toBe('abc');
    expect(toMinutes('06:00')).toBe(360);
    expect(toMinutes('6:00')).toBeNull();
  });
});
