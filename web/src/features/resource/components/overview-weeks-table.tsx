// The table view of the 12 weeks: the numbers behind the columns.
import { useTranslation } from 'react-i18next';
import { formatNumber } from '@/lib/format';
import { periodNames } from '../period-label';
import type { OverviewWeek } from '../overview-api';
import { levelTotal, OVERVIEW_LEVELS } from '../overview-levels';

export function OverviewWeeksTable({ weeks }: { weeks: OverviewWeek[] }) {
  const { t } = useTranslation();
  const cell = 'px-3 py-2 text-right tabular-nums';
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-body">
        <caption className="sr-only">{t('resources.overview.weeks.tableCaption')}</caption>
        <thead>
          <tr className="border-b border-line text-caption text-ink-muted">
            <th scope="col" className="px-3 py-2 text-left font-normal">
              {t('resources.overview.weeks.week')}
            </th>
            {OVERVIEW_LEVELS.map((level) => (
              <th key={level} scope="col" className={`${cell} font-normal`}>
                {t(`resources.filter.levelOption.${level.toUpperCase()}`)}
              </th>
            ))}
            <th scope="col" className={`${cell} font-normal`}>
              {t('resources.overview.weeks.total')}
            </th>
          </tr>
        </thead>
        <tbody>
          {weeks.map((week) => (
            <tr key={week.from} className="border-b border-line last:border-0">
              <th scope="row" className="px-3 py-2 text-left font-normal">
                {periodNames(week, 'WEEK', t).name}
              </th>
              {OVERVIEW_LEVELS.map((level) => (
                <td key={level} className={`${cell} ${level === 'over' && week.levels.over > 0 ? 'font-medium text-danger' : ''}`}>
                  {formatNumber(week.levels[level])}
                </td>
              ))}
              <td className={cell}>{formatNumber(levelTotal(week.levels))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
