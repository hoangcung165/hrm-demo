// A day of a Đơn bổ sung công as it is now and as it would be once approved: In, Out, worked hours and the marks. The
// times the request fills read "bổ sung".
import { useTranslation } from 'react-i18next';
import { formatCompanyTime } from '@/lib/format';
import type { DailyDay } from '../daily-api';
import { formatHours } from '../daily-model';
import { DailyMarks } from './daily-marks';

export type AdjustmentDayCompareProps = { now: DailyDay | null; after: DailyDay | null; caption: string };

function Time({ value, added }: { value: string | null; added: boolean }) {
  const { t } = useTranslation();
  if (!value) return <span className="font-medium text-danger">{t('attendanceAdjustment.compare.missing')}</span>;
  return (
    <span className="tabular-nums">
      {formatCompanyTime(value)}
      {added ? <span className="ml-1 text-caption text-brand-blue">{t('attendanceAdjustment.compare.added')}</span> : null}
    </span>
  );
}

export function AdjustmentDayCompare({ now, after, caption }: AdjustmentDayCompareProps) {
  const { t } = useTranslation();
  const days = [now, after];
  const rows = [
    { label: t('attendanceDaily.col.in'), cell: (day: DailyDay) => <Time value={day.in} added={day.inSource === 'ADJUSTMENT'} /> },
    { label: t('attendanceDaily.col.out'), cell: (day: DailyDay) => <Time value={day.out} added={day.outSource === 'ADJUSTMENT'} /> },
    { label: t('attendanceDaily.col.worked'), cell: (day: DailyDay) => <span className="tabular-nums">{day.workedMinutes > 0 ? formatHours(day.workedMinutes) : '–'}</span> },
    { label: t('attendanceDaily.col.marks'), cell: (day: DailyDay) => <DailyMarks day={day} /> },
  ];
  return (
    <table className="w-full border-collapse text-left text-body-small [&_td]:border-b [&_td]:border-line [&_td]:px-2 [&_td]:py-2 [&_th]:px-2 [&_th]:py-2">
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr className="text-caption text-ink-muted">
          <th scope="col" className="w-28 font-medium"><span className="sr-only">{t('attendanceAdjustment.compare.what')}</span></th>
          <th scope="col" className="font-medium">{t('attendanceAdjustment.compare.now')}</th>
          <th scope="col" className="font-medium">{t('attendanceAdjustment.compare.after')}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.label}>
            <th scope="row" className="border-b border-line font-normal text-ink-muted">{row.label}</th>
            {days.map((day, index) => (
              <td key={index}>{day ? row.cell(day) : '–'}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
