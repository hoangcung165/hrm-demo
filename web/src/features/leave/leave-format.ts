// How the leave screens write days and spans. Days follow the Vietnamese number format in both languages (0,5);
// a negative balance takes a real minus sign (−1,5). The words (buổi sáng, Thứ Năm) follow the UI language.
import type { TFunction } from 'i18next';
import { parseISO } from 'date-fns';
import { formatDate, formatDayMonth, formatNumber } from '@/lib/format';
import type { DayPart } from './api';

/** 4,5 · −1,5 · 0 */
export function formatDays(value: number): string {
  return value < 0 ? `−${formatNumber(-value)}` : formatNumber(value);
}

/** "T5 22/10" (vi), "Thu 22/10" (en): a day of a breakdown. */
export function weekdayDay(t: TFunction, iso: string): string {
  return `${t(`leave.weekday.short.${parseISO(iso).getDay()}`)} ${formatDayMonth(iso)}`;
}

/**
 * A request's days in a table or a row: "15/06/2026 (sáng)", "22/10 (chiều) – 23/10/2026", "30/12/2026 – 02/01/2027".
 * Only the parts that are not whole days are named.
 */
export function formatSpan(t: TFunction, startDate: string, startPart: DayPart, endDate: string, endPart: DayPart): string {
  const part = (value: DayPart) => (value === 'FULL' ? '' : ` (${t(`leave.partShort.${value}`)})`);
  if (startDate === endDate) return `${formatDate(startDate)}${part(startPart)}`;
  const sameYear = startDate.slice(0, 4) === endDate.slice(0, 4);
  return `${sameYear ? formatDayMonth(startDate) : formatDate(startDate)}${part(startPart)} – ${formatDate(endDate)}${part(endPart)}`;
}

/** The detail: "Thứ Năm 22/10/2026 buổi chiều đến Thứ Sáu 23/10/2026 cả ngày"; one day: "Thứ Tư 21/10/2026 buổi sáng". */
export function formatSpanLong(t: TFunction, startDate: string, startPart: DayPart, endDate: string, endPart: DayPart): string {
  const day = (iso: string, part: DayPart) => t('leave.span.day', { weekday: t(`leave.weekday.long.${parseISO(iso).getDay()}`), date: formatDate(iso), part: t(`leave.partLong.${part}`) });
  if (startDate === endDate) return day(startDate, startPart);
  return t('leave.span.range', { from: day(startDate, startPart), to: day(endDate, endPart) });
}
