// "Today" in the web app is the company's day, not the browser's. The company is one legal entity in one time zone
// (ADR 0003) and the API decides every date rule ("not in the past", the current week, who is ending soon) on that
// day. A browser in another zone, or CI in UTC, would otherwise send yesterday between 00:00 and 07:00 in Vietnam.
// Backend counterpart: `COMPANY_ZONE`.
export const COMPANY_TIME_ZONE = 'Asia/Ho_Chi_Minh';

const parts = new Intl.DateTimeFormat('en-US', { timeZone: COMPANY_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' });

/** The company's calendar day at `now`, as year, month (1-12) and day. */
function companyDay(now: Date): { year: number; month: number; day: number } {
  const found = Object.fromEntries(parts.formatToParts(now).map((part) => [part.type, Number(part.value)]));
  return { year: found.year!, month: found.month!, day: found.day! };
}

/** The company's day as `yyyy-MM-dd`, the form the API takes. */
export function companyTodayIso(now: Date = new Date()): string {
  const { year, month, day } = companyDay(now);
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** The company's day as a `Date` at local midnight, so date-fns (`startOfWeek`, `addDays`, `format`) work on it as on any date of the page. */
export function companyToday(now: Date = new Date()): Date {
  const { year, month, day } = companyDay(now);
  return new Date(year, month - 1, day);
}
