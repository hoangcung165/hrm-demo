// The words about an overload, shared by the alert of the allocate dialog and the toast after saving: who, how much,
// when, which other projects overlap, and how to fix it.
import type { TFunction } from 'i18next';
import { formatDate, formatDayMonth, formatPercent } from '@/lib/format';
import type { TryAllocationResult } from './allocation-api';

export type OverloadText = { title: string; others: string; fix: string };

/** The first overloaded period of the check named in full; `null` when nobody is overloaded. */
export function overloadText(result: TryAllocationResult, name: string, t: TFunction): OverloadText | null {
  const period = result.overloadedPeriods[0];
  if (!result.overloaded || !period) return null;
  const others = period.parts.filter((part) => !part.thisProject).map((part) => t('projects.detail.overlapPart', { name: part.projectName ?? part.projectCode ?? '', percent: formatPercent(part.percent) }));
  const percent = result.suggestedMaxPercent === null ? null : formatPercent(result.suggestedMaxPercent);
  const date = result.suggestedStart === null ? null : formatDate(result.suggestedStart);
  const fix = percent && date ? t('projects.allocate.fixBoth', { percent, date }) : percent ? t('projects.allocate.fixPercent', { percent }) : date ? t('projects.allocate.fixDate', { date }) : t('projects.allocate.fixNone');
  return {
    title: t('projects.allocate.overTitle', { name, percent: formatPercent(period.totalPercent), from: formatDayMonth(period.from), to: formatDate(period.to) }),
    others: others.join(', '),
    fix,
  };
}
