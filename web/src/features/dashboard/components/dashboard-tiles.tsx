import { useTranslation } from 'react-i18next';
import { StatTile } from '@/components/ui/stat-tile';
import { ErrorState } from '@/components/ui/error-state';
import { useDashboardTiles } from '../api';
import { useDashboardApprovals } from '../approvals-api';
import { formatNumber } from '@/lib/format';
import { companyTodayIso } from '@/lib/company-time';

/** The stat tiles of Tổng quan, in the caller's scope. A tile with a list behind it opens that list already filtered. */
export function DashboardTiles({ withApprovals }: { withApprovals: boolean }) {
  const { t } = useTranslation();
  const tiles = useDashboardTiles(true);
  const waiting = useDashboardApprovals(withApprovals);
  if (tiles.isError) {
    return (
      <section aria-label={t('dashboard.tiles.label')} className="rounded-md border border-line bg-surface">
        <ErrorState title={t('dashboard.tiles.loadError')} onRetry={() => void tiles.refetch()} />
      </section>
    );
  }
  const data = tiles.data;
  const busy = !data;
  const day = data?.date ?? companyTodayIso();
  return (
    <ul aria-label={t('dashboard.tiles.label')} aria-busy={busy || undefined} className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <li className="contents">
        <StatTile label={t('dashboard.tiles.employees')} value={data ? formatNumber(data.employees) : null} busy={busy} to="/employees" hint={data ? t('dashboard.tiles.inProbation', { count: data.inProbation }) : undefined} />
      </li>
      <li className="contents">
        <StatTile label={t('dashboard.tiles.working')} value={data ? formatNumber(data.workingToday) : null} busy={busy} hint={t('dashboard.tiles.workingHint')} />
      </li>
      <li className="contents">
        <StatTile label={t('dashboard.tiles.onLeave')} value={data ? formatNumber(data.onLeaveToday) : null} busy={busy} to={`/leave-calendar?view=week&date=${day}`} hint={t('dashboard.tiles.onLeaveHint')} />
      </li>
      {withApprovals ? (
        <li className="contents">
          <StatTile label={t('dashboard.tiles.waiting')} value={waiting.data ? formatNumber(waiting.data.total) : null} busy={waiting.isPending} to="/approvals" />
        </li>
      ) : null}
    </ul>
  );
}
