// The name of a heatmap column ("Tuần 42, 12/10 – 18/10", "Tháng 10/2026"), for the table head, the cell labels and
// the cell detail drawer.
import { getISOWeek, parseISO } from 'date-fns';
import type { TFunction } from 'i18next';
import { formatDayMonth } from '@/lib/format';
import type { HeatmapColumn, HeatmapGranularity } from './api';

/** `name` heads a column or the drawer; `period` ends a cell label ("..., tuần 42 (12/10 – 18/10)"). */
export function periodNames(column: HeatmapColumn, granularity: HeatmapGranularity, t: TFunction): { name: string; period: string } {
  const from = parseISO(column.from);
  if (granularity === 'MONTH') {
    const name = t('resources.heatmap.monthName', { month: from.getMonth() + 1, year: from.getFullYear() });
    return { name, period: name };
  }
  const week = getISOWeek(from);
  const range = `${formatDayMonth(column.from)} – ${formatDayMonth(column.to)}`;
  return { name: t('resources.heatmap.weekName', { week, range }), period: t('resources.heatmap.weekPeriod', { week, range }) };
}
