// "Cần chú ý": up to five people overloaded in the next 12 weeks and up to five whose allocation ends soon.
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { formatDayMonth, formatNumber, formatPercent } from '@/lib/format';
import type { Overview } from '../overview-api';
import { ResourcePersonCell } from './resource-person-cell';

export type OverviewAttentionProps = { attention: Overview['attention']; unit: string };

const withUnit = (params: Record<string, string>, unit: string) => `/resources?${new URLSearchParams({ ...params, ...(unit ? { unit } : {}) })}`;

export function OverviewAttention({ attention, unit }: OverviewAttentionProps) {
  const { t } = useTranslation();
  const { overloaded, ending } = attention;
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <section aria-labelledby="attention-over" className="flex flex-col gap-3">
        <h3 id="attention-over" className="text-body-strong">
          {t('resources.overview.attention.overTitle')}
        </h3>
        {overloaded.length === 0 ? (
          <p className="text-ink-muted">{t('resources.overview.attention.overNone')}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {overloaded.map((row) => (
              <li key={row.employee.id} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="min-w-0 flex-1 basis-40">
                  <ResourcePersonCell employee={row.employee} />
                </span>
                <Badge variant="danger">{formatPercent(row.peak)}</Badge>
                <span className="text-caption text-ink-muted">
                  {formatDayMonth(row.from)} – {formatDayMonth(row.to)} · {row.projects.join(', ')}
                </span>
              </li>
            ))}
          </ul>
        )}
        <Link to={withUnit({ tab: 'heatmap', level: 'OVER' }, unit)} className="w-fit rounded-sm text-body-small font-medium text-brand-blue focus-visible:shadow-focus-ring">
          {t('resources.overview.attention.overAll')}
        </Link>
      </section>
      <section aria-labelledby="attention-ending" className="flex flex-col gap-3">
        <h3 id="attention-ending" className="text-body-strong">
          {t('resources.overview.attention.endingTitle')}
        </h3>
        {ending.length === 0 ? (
          <p className="text-ink-muted">{t('resources.overview.attention.endingNone')}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {ending.map((row) => (
              <li key={`${row.employee.id}-${row.allocation.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="min-w-0 flex-1 basis-40">
                  <ResourcePersonCell employee={row.employee} />
                </span>
                {row.withoutNext ? <Badge variant="warning">{t('resources.ending.withoutNext')}</Badge> : null}
                <span className="text-caption text-ink-muted">
                  {t('resources.overview.attention.endingLine', {
                    project: row.allocation.projectCode,
                    days: row.daysLeft === 0 ? t('resources.ending.daysLeftToday') : t('resources.ending.daysLeft', { count: row.daysLeft, number: formatNumber(row.daysLeft) }),
                    load: formatPercent(row.loadAfter),
                  })}
                </span>
              </li>
            ))}
          </ul>
        )}
        <Link to={withUnit({ tab: 'ending' }, unit)} className="w-fit rounded-sm text-body-small font-medium text-brand-blue focus-visible:shadow-focus-ring">
          {t('resources.overview.attention.endingAll')}
        </Link>
      </section>
    </div>
  );
}
