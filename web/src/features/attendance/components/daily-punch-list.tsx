// The raw punches of a day, each with what the Bộ xử lý chấm công did with it: Vào, Ra, trùng, giữa ca, ngoài khung ca.
// A phone punch says so where a machine punch names its machine, and carries its place, accuracy, map link and photo.
import { Smartphone } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { companyDateIso, formatCompanyClock, formatDayMonth } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { PunchLine } from '../daily-api';
import { DailyMobilePunch } from './daily-mobile-punch';

export function DailyPunchList({ punches, day }: { punches: PunchLine[]; day: string }) {
  const { t } = useTranslation();
  return (
    <ol aria-label={t('attendanceDaily.drawer.punches', { count: punches.length })} className="m-0 list-none p-0">
      {punches.map((punch) => {
        const date = companyDateIso(punch.at);
        const used = punch.role === 'IN' || punch.role === 'OUT';
        return (
          <li key={punch.id} className={cn('grid grid-cols-[76px_52px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 border-b border-line py-2 text-body-small', !used && 'text-ink-muted')}>
            <span className="tabular-nums">{formatCompanyClock(punch.at)}</span>
            <span className="text-caption tabular-nums">{date !== day ? formatDayMonth(date) : ''}</span>
            {punch.mobile ? (
              <span className="flex items-center gap-1 truncate">
                <Smartphone aria-hidden="true" className="size-4 shrink-0 stroke-[1.5]" />
                {t('attendanceDaily.drawer.mobile.source')}
              </span>
            ) : (
              <span className="truncate">{punch.device ?? '–'}</span>
            )}
            <span className={cn(used && 'font-medium text-ink')}>{t(`attendanceDaily.role.${punch.role}`)}</span>
            {punch.mobile ? <DailyMobilePunch punch={punch} mobile={punch.mobile} /> : null}
          </li>
        );
      })}
    </ol>
  );
}
