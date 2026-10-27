// The desktop table: a group row per person, then one row per day with the shift, In, Out, worked hours and marks.
import { ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import type { DailyAttendance, DailyDay, DailyRow } from '../daily-api';
import { formatHours, shiftById } from '../daily-model';
import { dayLabel, isMissing, PunchTime, ShiftCell } from './daily-cells';
import { DailyMarks } from './daily-marks';
import { DailyPerson, DailyTotals } from './daily-totals';

export type DailyTableProps = { data: DailyAttendance; caption: string; onOpen: (employeeId: string, date: string) => void };

function DayRow({ row, day, shift, onOpen }: { row: DailyRow; day: DailyDay; shift: DailyAttendance['shifts'][number] | undefined; onOpen: DailyTableProps['onOpen'] }) {
  const { t } = useTranslation();
  const label = dayLabel(day.date, t);
  return (
    <tr>
      <td className="whitespace-nowrap tabular-nums">{label}</td>
      <td><ShiftCell shift={shift} /></td>
      <td className="whitespace-nowrap tabular-nums"><PunchTime value={day.in} day={day.date} missing={isMissing(day, 'IN')} /></td>
      <td className="whitespace-nowrap tabular-nums"><PunchTime value={day.out} day={day.date} missing={isMissing(day, 'OUT')} /></td>
      <td className="text-right tabular-nums">{day.workedMinutes > 0 ? formatHours(day.workedMinutes) : <span className="text-ink-muted">–</span>}</td>
      <td><DailyMarks day={day} /></td>
      <td className="text-right">
        <Button variant="ghost" size="icon-sm" aria-label={t('attendanceDaily.openDay', { date: label, name: row.employee.fullName })} onClick={() => onOpen(row.employee.id, day.date)}>
          <ChevronRight aria-hidden="true" />
        </Button>
      </td>
    </tr>
  );
}

export function DailyTable({ data, caption, onOpen }: DailyTableProps) {
  const { t } = useTranslation();
  const shifts = shiftById(data.shifts);
  return (
    <div className="overflow-x-auto rounded-md border border-line">
      <table className="w-full border-collapse text-left [&_td]:border-b [&_td]:border-line [&_td]:px-3 [&_td]:py-2 [&_th]:bg-surface-muted [&_th]:px-3 [&_th]:py-2 [&_th]:text-caption [&_th]:font-medium [&_th]:text-ink-muted">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            <th className="w-28">{t('attendanceDaily.col.date')}</th>
            <th className="w-52">{t('attendanceDaily.col.shift')}</th>
            <th className="w-24">{t('attendanceDaily.col.in')}</th>
            <th className="w-28">{t('attendanceDaily.col.out')}</th>
            <th className="w-24 text-right">{t('attendanceDaily.col.worked')}</th>
            <th>{t('attendanceDaily.col.marks')}</th>
            <th className="w-14"><span className="sr-only">{t('attendanceDaily.col.detail')}</span></th>
          </tr>
        </thead>
        {data.rows.map((row) => (
          <tbody key={row.employee.id}>
            <tr className="[&>td]:bg-surface-muted">
              <td colSpan={7}>
                <span className="flex items-center gap-4">
                  <DailyPerson row={row} />
                  <DailyTotals row={row} />
                </span>
              </td>
            </tr>
            {row.days.map((day) => (
              <DayRow key={day.date} row={row} day={day} shift={day.shiftId ? shifts.get(day.shiftId) : undefined} onOpen={onOpen} />
            ))}
          </tbody>
        ))}
      </table>
    </div>
  );
}
