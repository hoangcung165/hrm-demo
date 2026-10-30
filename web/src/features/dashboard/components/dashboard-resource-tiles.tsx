// Tải phân bổ trung bình, Bench and Quá tải of this week, from the same answer as the Nguồn lực overview
// (GET /api/resources/overview, no filter), so each number is the one on /resources. Each tile opens its list.
import { useTranslation } from 'react-i18next';
import { ErrorState } from '@/components/ui/error-state';
import { StatTile } from '@/components/ui/stat-tile';
import { useOverview } from '@/features/resource/overview-api';
import { formatNumber, formatPercent } from '@/lib/format';

export function DashboardResourceTiles() {
  const { t } = useTranslation();
  const overview = useOverview({ week: '', orgUnitId: '' });
  if (overview.isError && !overview.data) {
    return (
      <section aria-label={t('dashboard.resources.label')} className="rounded-md border border-line bg-surface">
        <ErrorState title={t('dashboard.resources.loadError')} onRetry={() => void overview.refetch()} />
      </section>
    );
  }
  const data = overview.data;
  const tiles = data?.tiles;
  return (
    <ul aria-label={t('dashboard.resources.label')} aria-busy={!data || undefined} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <li className="contents">
        <StatTile
          label={t('dashboard.resources.average')}
          busy={!tiles}
          value={tiles && tiles.averageLoad !== null ? formatPercent(tiles.averageLoad) : null}
          hint={tiles ? t(tiles.averageLoad === null ? 'dashboard.resources.averageNone' : 'dashboard.resources.averageHint') : undefined}
          to="/resources"
        />
      </li>
      <li className="contents">
        <StatTile
          label={t('dashboard.resources.bench')}
          busy={!tiles}
          value={tiles ? formatNumber(tiles.bench) : null}
          hint={data ? t('dashboard.resources.benchHint', { percent: data.thresholds.benchPercent }) : undefined}
          to="/resources?tab=bench"
        />
      </li>
      <li className="contents">
        <StatTile
          label={t('dashboard.resources.over')}
          busy={!tiles}
          tone={tiles && tiles.overloadedNow > 0 ? 'danger' : 'default'}
          value={tiles ? formatNumber(tiles.overloadedNow) : null}
          hint={tiles ? t('dashboard.resources.overHint', { number: formatNumber(tiles.overloadedIn12Weeks) }) : undefined}
          to="/resources?tab=heatmap&level=OVER"
        />
      </li>
    </ul>
  );
}
