// The 12 weeks as stacked columns by level, the number of Quá tải people on top of each. Colour is never the only
// signal: every column is read out with its numbers, and "Xem dạng bảng" shows the same numbers as a table.
import { useTranslation } from 'react-i18next';
import { formatDayMonth, formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';
import { periodNames } from '../period-label';
import type { OverviewWeek } from '../overview-api';
import { levelFill, levelTotal, OVERVIEW_LEVELS } from '../overview-levels';

export function OverviewWeeksChart({ weeks }: { weeks: OverviewWeek[] }) {
  const { t } = useTranslation();
  const tallest = Math.max(1, ...weeks.map((week) => levelTotal(week.levels)));
  const name = (level: (typeof OVERVIEW_LEVELS)[number]) => t(`resources.filter.levelOption.${level.toUpperCase()}`);
  return (
    <div className="overflow-x-auto">
      <ul className="flex min-w-[560px] items-end gap-2">
        {weeks.map((week) => {
          const label = `${periodNames(week, 'WEEK', t).name}: ${OVERVIEW_LEVELS.map((level) => `${name(level)} ${formatNumber(week.levels[level])}`).join(', ')}`;
          return (
            <li key={week.from} className="flex min-w-0 flex-1 flex-col items-center gap-1">
              <span className={cn('h-5 text-caption font-medium tabular-nums', week.levels.over > 0 ? 'text-danger' : 'text-transparent')} aria-hidden="true">
                {week.levels.over}
              </span>
              <div role="img" aria-label={label} className="flex h-40 w-full flex-col-reverse justify-start overflow-hidden rounded-sm bg-surface-muted/50">
                {OVERVIEW_LEVELS.map((level) => (week.levels[level] > 0 ? <span key={level} className={cn('w-full', levelFill[level])} style={{ height: `${(week.levels[level] / tallest) * 100}%` }} /> : null))}
              </div>
              <span className="text-caption text-ink-muted tabular-nums" aria-hidden="true">
                {formatDayMonth(week.from)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
