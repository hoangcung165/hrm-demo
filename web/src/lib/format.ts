// Shared formatters. Components never format dates, money or numbers themselves.
// Dates, money, percentages and numbers always follow Vietnamese conventions (dd/MM/yyyy, 12.500.000 ₫, decimal comma),
// in both UI languages. Only the file size follows the UI language, because it is quoted inside translated sentences.
import { differenceInCalendarDays, differenceInMinutes, differenceInMonths, format, isValid, parseISO } from 'date-fns';
import i18n from '@/i18n';

type DateInput = Date | string;

const toDate = (value: DateInput): Date => (typeof value === 'string' ? parseISO(value) : value);

const integer = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 });

/** 02/10/2026 */
export function formatDate(value: DateInput): string {
  const d = toDate(value);
  return isValid(d) ? format(d, 'dd/MM/yyyy') : '';
}

/** 02/10, for compact rows where the year is plain */
export function formatDayMonth(value: DateInput): string {
  const d = toDate(value);
  return isValid(d) ? format(d, 'dd/MM') : '';
}

/** 02/10 09:30, for compact rows */
export function formatDayMonthTime(value: DateInput): string {
  const d = toDate(value);
  return isValid(d) ? format(d, 'dd/MM HH:mm') : '';
}

/** 01/01/2026 for one day; 16/02 – 20/02/2026 within one year; 30/12/2026 – 02/01/2027 across years. */
export function formatDateRange(start: DateInput, end: DateInput): string {
  const from = toDate(start);
  const to = toDate(end);
  if (!isValid(from) || !isValid(to)) return '';
  if (differenceInCalendarDays(to, from) === 0) return format(from, 'dd/MM/yyyy');
  return from.getFullYear() === to.getFullYear() ? `${format(from, 'dd/MM')} – ${format(to, 'dd/MM/yyyy')}` : `${format(from, 'dd/MM/yyyy')} – ${format(to, 'dd/MM/yyyy')}`;
}

/** Days in a range, both ends included: 16/02 – 20/02 is 5. */
export function daysInRange(start: DateInput, end: DateInput): number {
  return differenceInCalendarDays(toDate(end), toDate(start)) + 1;
}

/** 09:30 (24-hour) */
export function formatTime(value: DateInput): string {
  const d = toDate(value);
  return isValid(d) ? format(d, 'HH:mm') : '';
}

/** 02/10/2026 09:30 */
export function formatDateTime(value: DateInput): string {
  const d = toDate(value);
  return isValid(d) ? format(d, 'dd/MM/yyyy HH:mm') : '';
}

/**
 * When something happened, in a list of recent events: "Vừa xong" within a minute, "Hôm nay 15:40", "Hôm qua 15:40",
 * then 08/10 08:30, and 08/10/2025 08:30 in another year. Follows the UI language, as it reads as words.
 */
export function formatRelativeTime(value: DateInput, now: Date = new Date()): string {
  const d = toDate(value);
  if (!isValid(d)) return '';
  if (Math.abs(differenceInMinutes(now, d)) < 1) return i18n.t('time.justNow');
  const days = differenceInCalendarDays(now, d);
  if (days === 0) return i18n.t('time.today', { time: format(d, 'HH:mm') });
  if (days === 1) return i18n.t('time.yesterday', { time: format(d, 'HH:mm') });
  return format(d, d.getFullYear() === now.getFullYear() ? 'dd/MM HH:mm' : 'dd/MM/yyyy HH:mm');
}

/** 12.500.000 ₫ (VND has no minor unit) */
export function formatMoney(amount: number): string {
  return `${integer.format(Math.round(amount))} ₫`;
}

/** 12,5% — input is a percentage value, not a ratio */
export function formatPercent(value: number): string {
  return `${decimal.format(value)}%`;
}

/** 21,5 — days, hours, counts */
export function formatNumber(value: number): string {
  return decimal.format(value);
}

/** 2,4 MB (vi) · 2.4 MB (en) · 512 KB — size of a file the user picked, in the current UI language */
export function formatFileSize(bytes: number): string {
  const locale = i18n.language === 'en' ? 'en-US' : 'vi-VN';
  const number = (value: number, maximumFractionDigits: number) => new Intl.NumberFormat(locale, { maximumFractionDigits }).format(value);
  if (bytes >= 1024 * 1024) return `${number(bytes / (1024 * 1024), 1)} MB`;
  if (bytes >= 1024) return `${number(bytes / 1024, 0)} KB`;
  return `${number(bytes, 0)} B`;
}

/** 0912 345 678: a stored 10-digit phone number in groups; anything else as it is. */
export function formatPhone(phone: string): string {
  return /^0\d{9}$/.test(phone) ? `${phone.slice(0, 4)} ${phone.slice(4, 7)} ${phone.slice(7)}` : phone;
}

/** Whole years and months from `from` to `to`: an age, a length of service. Negative spans count as zero. */
export function yearsAndMonths(from: DateInput, to: DateInput = new Date()): { years: number; months: number } {
  const months = Math.max(0, differenceInMonths(toDate(to), toDate(from)));
  return { years: Math.floor(months / 12), months: months % 12 };
}
