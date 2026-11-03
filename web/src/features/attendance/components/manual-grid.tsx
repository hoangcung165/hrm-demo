// The grid of Nhập công thủ công: one row per person of the unit, one column per day of the week. A cell opens the
// dialog for that day; the row's button for the person's week; a column header for the whole unit that day.
import { CalendarRange } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Person } from '@/components/ui/person';
import type { ManualRow } from '../manual-api';
import { cellOf, type ManualScope } from '../manual-model';
import { dayLabel } from './daily-cells';
import { ManualCell } from './manual-cell';

export type ManualGridProps = { rows: ManualRow[]; days: string[]; today: string; caption: string; onOpen: (scope: ManualScope) => void };

export function ManualGrid({ rows, days, today, caption, onOpen }: ManualGridProps) {
  const { t } = useTranslation();
  return (
    <div className="overflow-x-auto rounded-md border border-line bg-surface">
      <table className="w-full min-w-[960px] border-collapse text-left [&_td]:border-b [&_td]:border-line [&_td]:px-2 [&_td]:py-1.5 [&_th]:bg-surface-muted [&_th]:px-2 [&_th]:py-2 [&_th]:text-caption [&_th]:font-medium [&_th]:text-ink-muted">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            <th scope="col" className="w-64 pl-3">{t('attendanceManual.col.employee')}</th>
            {days.map((day) => (
              <th key={day} scope="col" className="text-center">
                {day > today ? (
                  <span className="tabular-nums">{dayLabel(day, t)}</span>
                ) : (
                  <Button variant="ghost" size="sm" className="w-full tabular-nums" aria-label={t('attendanceManual.forDay', { day: dayLabel(day, t) })} onClick={() => onOpen({ kind: 'day', date: day })}>
                    {dayLabel(day, t)}
                  </Button>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.employee.id}>
              <th scope="row" className="!bg-surface pl-3 font-normal">
                <span className="flex items-center gap-2">
                  <Person name={row.employee.fullName} caption={row.employee.code} className="min-w-0 flex-1" />
                  <Button variant="ghost" size="icon-sm" aria-label={t('attendanceManual.forWeek', { name: row.employee.fullName })} onClick={() => onOpen({ kind: 'row', row })}>
                    <CalendarRange aria-hidden="true" />
                  </Button>
                </span>
              </th>
              {days.map((day) => (
                <td key={day}>
                  <ManualCell cell={cellOf(row, day, today)} label={`${row.employee.fullName}, ${dayLabel(day, t)}`} onOpen={() => onOpen({ kind: 'cell', row, date: day })} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
