// Shared formatters. Components never format dates, money or numbers themselves.
// Dates, money, percentages and numbers always follow Vietnamese conventions (dd/MM/yyyy, 12.500.000 ₫, decimal comma),
// in both UI languages. Only the file size follows the UI language, because it is quoted inside translated sentences.
import { format, isValid, parseISO } from 'date-fns';
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
