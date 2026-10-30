// The sentences of a "Nghỉ hôm nay" row.
import type { TFunction } from 'i18next';
import { companyTodayIso } from '@/lib/company-time';
import { formatDate, formatDayMonth } from '@/lib/format';
import type { LeaveTodayEntry } from './leave-today-api';

/** "cả ngày", "buổi chiều", and "đến 16/10" when the request goes on after today; the year only when it is not this one. */
export function leavePartLabel(t: TFunction, entry: LeaveTodayEntry, today: string = companyTodayIso()): string {
  const part = t(`dashboard.leaveToday.part.${entry.part}`);
  if (entry.until <= today) return part;
  const until = entry.until.slice(0, 4) === today.slice(0, 4) ? formatDayMonth(entry.until) : formatDate(entry.until);
  return t('dashboard.leaveToday.partUntil', { part, until });
}
