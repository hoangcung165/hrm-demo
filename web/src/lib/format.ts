// Shared formatters. Components never format dates, money or numbers themselves.
import { format, isValid, parseISO } from 'date-fns';

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
