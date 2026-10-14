// "Mức Tải phân bổ tuần này": one stacked bar of everybody in the pool and a row per level with its count and share.
import { useTranslation } from 'react-i18next';
import { formatNumber, formatPercent } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { OverviewLevels } from '../overview-api';
import { levelFill, levelTotal, OVERVIEW_LEVELS } from '../overview-levels';

export function OverviewThisWeek({ levels }: { levels: OverviewLevels }) {
  const { t } = useTranslation();
  const total = levelTotal(levels);
  const share = (count: number) => (total === 0 ? 0 : Math.round((count / total) * 100));
  const name = (level: (typeof OVERVIEW_LEVELS)[number]) => t(`resources.filter.levelOption.${level.toUpperCase()}`);
  const summary = OVERVIEW_LEVELS.map((level) => `${name(level)}: ${formatNumber(levels[level])}`).join(', ');
  return (
    <div className="flex flex-col gap-4">
      <div role="img" aria-label={t('resources.overview.thisWeek.bar', { summary })} className="flex h-4 overflow-hidden rounded-sm bg-surface-muted">
        {OVERVIEW_LEVELS.map((level) => (levels[level] > 0 ? <span key={level} className={cn('h-full', levelFill[level])} style={{ width: `${(levels[level] / total) * 100}%` }} /> : null))}
      </div>
      <ul className="flex flex-col gap-2">
        {OVERVIEW_LEVELS.map((level) => (
          <li key={level} className="flex items-center gap-3">
            <span aria-hidden="true" className={cn('size-3 shrink-0 rounded-sm', levelFill[level])} />
            <span className="flex-1">{name(level)}</span>
            <span className="font-medium tabular-nums">{t('resources.overview.thisWeek.people', { count: levels[level], number: formatNumber(levels[level]) })}</span>
            <span className="w-12 text-right text-ink-muted tabular-nums">{formatPercent(share(levels[level]))}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
