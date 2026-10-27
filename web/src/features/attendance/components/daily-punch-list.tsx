// The raw punches of a day, each with what the Bộ xử lý chấm công did with it: Vào, Ra, trùng, giữa ca, ngoài khung ca.
import { useTranslation } from 'react-i18next';
import { companyDateIso, formatCompanyClock, formatDayMonth } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { PunchLine } from '../daily-api';

export function DailyPunchList({ punches, day }: { punches: PunchLine[]; day: string }) {
  const { t } = useTranslation();
  return (
    <ol aria-label={t('attendanceDaily.drawer.punches', { count: punches.length })} className="m-0 list-none p-0">
      {punches.map((punch) => {
        const date = companyDateIso(punch.at);
        const used = punch.role === 'IN' || punch.role === 'OUT';
        return (
          <li key={punch.at} className={cn('grid grid-cols-[76px_52px_minmax(0,1fr)_auto] items-center gap-3 border-b border-line py-2 text-body-small', !used && 'text-ink-muted')}>
            <span className="tabular-nums">{formatCompanyClock(punch.at)}</span>
            <span className="text-caption tabular-nums">{date !== day ? formatDayMonth(date) : ''}</span>
            <span className="truncate">{punch.device ?? '–'}</span>
            <span className={cn(used && 'font-medium text-ink')}>{t(`attendanceDaily.role.${punch.role}`)}</span>
          </li>
        );
      })}
    </ol>
  );
}
