// The heatmap table: a row per person, a cell per week or month, the first column a link to the profile.
import { parseISO } from 'date-fns';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { HeatmapGrid, type HeatmapGridColumn, type HeatmapGridMonth, type HeatmapGridRow } from '@/components/ui/heatmap-grid';
import { Person } from '@/components/ui/person';
import { useCurrentAccount } from '@/features/auth/account-context';
import { formatDayMonth, formatPercent, toIsoDate } from '@/lib/format';
import type { Heatmap } from '../api';
import type { CellSelection } from '../cell-selection';
import { periodNames } from '../period-label';

export type HeatmapTableProps = {
  /** The heatmap to show; `undefined` while the first one loads. */
  data: Heatmap | undefined;
  /** A newer query runs: the rows stay, dimmed. */
  busy?: boolean;
  compact?: boolean;
  /** Makes the cells buttons: the cell is opened in the detail drawer. */
  onCellSelect?: (selection: CellSelection) => void;
  selected?: CellSelection | null;
};

export function HeatmapTable({ data, busy = false, compact = false, onCellSelect, selected }: HeatmapTableProps) {
  const { t } = useTranslation();
  const { permissions } = useCurrentAccount();
  const canOpenProfile = permissions.includes('EMPLOYEE_VIEW');
  const todayIso = toIsoDate(new Date());

  const { columns, months, names } = useMemo(() => {
    const weekly = data?.granularity !== 'MONTH';
    const list: HeatmapGridColumn[] = [];
    const periods: string[] = [];
    const groups: HeatmapGridMonth[] = [];
    for (const column of data?.columns ?? []) {
      const from = parseISO(column.from);
      const month = from.getMonth() + 1;
      const year = from.getFullYear();
      const { name, period } = periodNames(column, data?.granularity ?? 'WEEK', t);
      periods.push(period);
      list.push({
        id: column.from,
        label: weekly ? formatDayMonth(column.from) : t('resources.heatmap.monthShort', { month }),
        name,
        current: column.from <= todayIso && todayIso <= column.to,
      });
      const last = groups[groups.length - 1];
      const id = `${year}-${month}`;
      if (last?.id === id) last.span += 1;
      else groups.push({ id, label: t('resources.heatmap.monthLabel', { month, year }), span: 1 });
    }
    return { columns: list, months: weekly ? groups : undefined, names: periods };
  }, [data?.columns, data?.granularity, t, todayIso]);

  const rows: HeatmapGridRow[] = (data?.items ?? []).map((row) => {
    const person = <Person name={row.employee.fullName} caption={[row.employee.code, row.employee.orgUnitName].filter(Boolean).join(' · ')} />;
    return {
      id: row.employee.id,
      lead: canOpenProfile ? (
        <Link to={`/employees/${row.employee.id}`} className="block rounded-sm hover:text-brand-blue focus-visible:shadow-focus-ring">
          {person}
        </Link>
      ) : (
        person
      ),
      cells: row.cells.map((percent, i) => ({
        percent,
        label: t(percent > 100 ? 'resources.heatmap.cellOver' : 'resources.heatmap.cell', { percent: formatPercent(percent), name: row.employee.fullName, period: names[i] ?? '' }),
      })),
    };
  });

  return (
    <HeatmapGrid
      caption={t('resources.heatmap.caption')}
      leadHeader={t('resources.heatmap.person')}
      columns={columns.length > 0 ? columns : []}
      months={months}
      rows={rows}
      thresholds={data ? { bench: data.thresholds.benchPercent, nearFull: data.thresholds.nearFullPercent } : undefined}
      onCellSelect={
        onCellSelect && data
          ? (rowId, columnIndex) => {
              const column = data.columns[columnIndex];
              if (column) onCellSelect({ employeeId: rowId, from: column.from, to: column.to });
            }
          : undefined
      }
      selected={selected ? { rowId: selected.employeeId, columnIndex: data?.columns.findIndex((column) => column.from === selected.from) ?? -1 } : null}
      loading={!data}
      loadingLabel={t('resources.heatmap.loading')}
      busy={busy}
      compact={compact}
    />
  );
}
