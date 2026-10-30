// Turns the headcount answer into the rows of the two charts. Pure, so it is tested without the page.
import type { TFunction } from 'i18next';
import type { BarListRow } from '@/components/ui/bar-list';
import type { PairedPeriod } from '@/components/ui/paired-columns';
import type { MonthFlow, UnitCount } from './headcount-api';

/** A Bar list holds at most 8 rows: the 7 largest units and "Khác" for the rest. */
export const MAX_UNIT_ROWS = 8;

/** The units' list shows the Employees who belong directly to the unit, so the link must not add the child units. */
const unitLink = (id: string) => `/employees?${new URLSearchParams({ orgUnitId: id, includeSubUnits: 'false' })}`;

export function unitRows(t: TFunction, units: UnitCount[]): BarListRow[] {
  const shown = units.length > MAX_UNIT_ROWS ? units.slice(0, MAX_UNIT_ROWS - 1) : units;
  const rows = shown.map((unit, index): BarListRow => ({
    key: unit.orgUnitId ?? `company-${index}`,
    label: unit.orgUnitName ?? t('dashboard.headcount.units.company'),
    value: unit.count,
    to: unit.orgUnitId ? unitLink(unit.orgUnitId) : undefined,
  }));
  const rest = units.slice(shown.length);
  if (rest.length > 0) rows.push({ key: 'other', label: t('dashboard.headcount.units.other'), value: rest.reduce((sum, unit) => sum + unit.count, 0) });
  return rows;
}

export const totalOf = (units: UnitCount[]) => units.reduce((sum, unit) => sum + unit.count, 0);

export function monthPeriods(t: TFunction, months: MonthFlow[]): PairedPeriod[] {
  return months.map((flow, index) => {
    const [year = '', month = ''] = flow.month.split('-');
    const values = { month, year };
    const full = t('dashboard.headcount.flow.month', values);
    return {
      key: flow.month,
      short: t('dashboard.headcount.flow.short', values),
      full,
      a: flow.joins,
      b: flow.leaves,
      current: index === months.length - 1,
      sentence: t('dashboard.headcount.flow.sentence', { month: full, joins: flow.joins, leaves: flow.leaves }),
    };
  });
}

export const flowTotals = (months: MonthFlow[]) => ({ joins: months.reduce((sum, flow) => sum + flow.joins, 0), leaves: months.reduce((sum, flow) => sum + flow.leaves, 0) });
