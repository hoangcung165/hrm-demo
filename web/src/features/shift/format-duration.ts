// "8 giờ", "7 giờ 30 phút", "45 phút": a length of time in minutes, in the UI language.
import type { TFunction } from 'i18next';
import { formatNumber } from '@/lib/format';

export function formatMinutes(minutes: number, t: TFunction): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return t('shifts.duration.minutes', { minutes: formatNumber(rest) });
  if (rest === 0) return t('shifts.duration.hours', { hours: formatNumber(hours) });
  return t('shifts.duration.hoursMinutes', { hours: formatNumber(hours), minutes: formatNumber(rest) });
}
