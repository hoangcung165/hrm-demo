// The six stat tiles of the Tổng quan tab. The last three lead to the list behind the number.
import { useTranslation } from 'react-i18next';
import { StatTile } from '@/components/ui/stat-tile';
import { formatNumber, formatPercent } from '@/lib/format';
import type { Overview } from '../overview-api';

export type OverviewTilesProps = { data: Overview | undefined; unit: string };

export function OverviewTiles({ data, unit }: OverviewTilesProps) {
  const { t } = useTranslation();
  const tiles = data?.tiles;
  const link = (params: Record<string, string>) => `/resources?${new URLSearchParams({ ...params, ...(unit ? { unit } : {}) })}`;
  return (
    <ul aria-label={t('resources.overview.tiles')} className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      <li className="flex">
        <StatTile
          className="w-full"
          label={t('resources.overview.tile.projects')}
          busy={!tiles}
          value={tiles ? formatNumber(tiles.projectsRunning) : null}
          hint={tiles ? t('resources.overview.tile.projectsHint', { planned: formatNumber(tiles.projectsPlanned), onHold: formatNumber(tiles.projectsOnHold) }) : undefined}
        />
      </li>
      <li className="flex">
        <StatTile
          className="w-full"
          label={t('resources.overview.tile.staff')}
          busy={!tiles}
          value={tiles ? formatNumber(tiles.projectStaff) : null}
          hint={tiles ? t('resources.overview.tile.staffHint', { people: formatNumber(tiles.people) }) : undefined}
        />
      </li>
      <li className="flex">
        <StatTile
          className="w-full"
          label={t('resources.overview.tile.average')}
          busy={!tiles}
          value={tiles && tiles.averageLoad !== null ? formatPercent(tiles.averageLoad) : null}
          hint={tiles ? t(tiles.averageLoad === null ? 'resources.overview.tile.averageNone' : 'resources.overview.tile.averageHint') : undefined}
        />
      </li>
      <li className="flex">
        <StatTile
          className="w-full"
          label={t('resources.overview.tile.bench')}
          busy={!tiles}
          value={tiles ? formatNumber(tiles.bench) : null}
          hint={tiles ? t('resources.overview.tile.benchHint', { percent: data?.thresholds.benchPercent }) : undefined}
          to={link({ tab: 'bench' })}
        />
      </li>
      <li className="flex">
        <StatTile
          className="w-full"
          label={t('resources.overview.tile.over')}
          busy={!tiles}
          tone={tiles && tiles.overloadedNow > 0 ? 'danger' : 'default'}
          value={tiles ? formatNumber(tiles.overloadedNow) : null}
          hint={tiles ? t('resources.overview.tile.overHint', { number: formatNumber(tiles.overloadedIn12Weeks) }) : undefined}
          to={link({ tab: 'heatmap', level: 'OVER' })}
        />
      </li>
      <li className="flex">
        <StatTile
          className="w-full"
          label={t('resources.overview.tile.ending')}
          busy={!tiles}
          value={tiles ? formatNumber(tiles.endingSoon) : null}
          hint={tiles ? t('resources.overview.tile.endingHint', { weeks: data?.thresholds.endingWeeks }) : undefined}
          to={link({ tab: 'ending' })}
        />
      </li>
    </ul>
  );
}
