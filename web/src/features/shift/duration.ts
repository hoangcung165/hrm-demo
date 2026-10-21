// The length of a shift as the backend works it out (`ShiftPattern`): used for the live preview in the form, so it
// must agree with `scheduledMinutes` and `nightMinutes` of the API.
const DAY = 24 * 60;
const NIGHT_FROM = 22 * 60;
const NIGHT_TO = 6 * 60;

/** "6:00" → "06:00"; anything that is not a time is returned as typed (trimmed). */
export function normalizeTime(value: string): string {
  const text = value.trim();
  const match = /^(\d{1,2}):(\d{2})$/.exec(text);
  return match ? `${match[1]!.padStart(2, '0')}:${match[2]}` : text;
}

/** "HH:mm" → minutes since midnight; `null` when it is not a time. */
export function toMinutes(time: string): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

const offset = (from: number, to: number) => (((to - from) % DAY) + DAY) % DAY;

export type ShiftTimes = { startTime: string; endTime: string; breakStart: string; breakEnd: string };

export type ShiftLength = { crossesMidnight: boolean; scheduledMinutes: number; nightMinutes: number };

/** `null` while the times cannot make a shift: a time missing or malformed, the end equal to the start, or a break outside the shift. */
export function shiftLength({ startTime, endTime, breakStart, breakEnd }: ShiftTimes): ShiftLength | null {
  const start = toMinutes(startTime);
  const end = toMinutes(endTime);
  if (start === null || end === null || start === end) return null;
  const length = offset(start, end);
  let from = length;
  let to = length;
  let breakLength = 0;
  if (breakStart || breakEnd) {
    const bs = toMinutes(breakStart);
    const be = toMinutes(breakEnd);
    if (bs === null || be === null) return null;
    from = offset(start, bs);
    to = offset(start, be);
    if (from >= to || to > length) return null;
    breakLength = to - from;
  }
  let night = 0;
  for (let minute = 0; minute < length; minute++) {
    if (minute >= from && minute < to) continue;
    const clock = (start + minute) % DAY;
    if (clock >= NIGHT_FROM || clock < NIGHT_TO) night++;
  }
  return { crossesMidnight: end <= start, scheduledMinutes: length - breakLength, nightMinutes: night };
}
