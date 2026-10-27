// At 390: a list instead of the table. A person's header, then a row per day: the date, a caption with the shift and the
// hours, the marks, and a button for the day's detail.
import { ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { formatCompanyTime } from '@/lib/format';
import type { DailyAttendance, DailyDay } from '../daily-api';
import { formatHours, shiftById } from '../daily-model';
import { dayLabel } from './daily-cells';
import { DailyMarks } from './daily-marks';
import { DailyPerson } from './daily-totals';

export type DailyAgendaProps = { data: DailyAttendance; caption: string; onOpen: (employeeId: string, date: string) => void };

/** "Hành chính · 08:17 → 17:02 · 7:40": what the day came to. */
function caption(day: DailyDay, shiftName: string | undefined, t: (key: string) => string): string {
  const hours = day.in || day.out ? `${day.in ? formatCompanyTime(day.in) : t('attendanceDaily.missing').toLowerCase()} → ${day.out ? formatCompanyTime(day.out) : t('attendanceDaily.missing').toLowerCase()}` : '';
  const worked = day.workedMinutes > 0 ? formatHours(day.workedMinutes) : '';
  return [shiftName ?? t('attendanceDaily.noShift'), hours, worked].filter(Boolean).join(' · ');
}

export function DailyAgenda({ data, caption: label, onOpen }: DailyAgendaProps) {
  const { t } = useTranslation();
  const shifts = shiftById(data.shifts);
  return (
    <ul aria-label={label} className="m-0 flex list-none flex-col overflow-hidden rounded-md border border-line p-0">
      {data.rows.flatMap((row) => [
        <li key={row.employee.id} className="bg-surface-muted px-4 py-2">
          <DailyPerson row={row} withTotals />
        </li>,
        ...row.days.map((day) => {
          const text = dayLabel(day.date, t);
          return (
            <li key={`${row.employee.id}-${day.date}`} className="flex flex-col gap-1 border-t border-line px-4 py-2">
              <span className="flex items-center gap-2">
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="font-medium tabular-nums">{text}</span>
                  <span className="text-caption text-ink-muted tabular-nums">{caption(day, day.shiftId ? shifts.get(day.shiftId)?.name : undefined, t)}</span>
                </span>
                <Button variant="ghost" size="icon-sm" className="size-11" aria-label={t('attendanceDaily.openDay', { date: text, name: row.employee.fullName })} onClick={() => onOpen(row.employee.id, day.date)}>
                  <ChevronRight aria-hidden="true" />
                </Button>
              </span>
              <DailyMarks day={day} />
            </li>
          );
        }),
      ])}
    </ul>
  );
}
