// The Địa điểm chấm công: a table, or compact two-line rows below 768px. A company has a handful of places, so the list
// is not paged. Each row ends with its menu.
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { formatCoordinate, formatDistance, formatNumber } from '@/lib/format';
import { useMediaQuery } from '@/lib/use-media-query';
import type { CheckinLocation } from '../api';
import { LocationRowMenu } from './location-row-menu';
import { LocationStatusBadge } from './location-status-badge';

// A company has a handful of places; the table pages from this many.
const PAGE_SIZE = 100;

export type LocationTableProps = {
  /** Ignored while `loading`. */
  rows: CheckinLocation[];
  loading?: boolean;
};

const coordinates = (place: CheckinLocation) => `${formatCoordinate(place.latitude)}; ${formatCoordinate(place.longitude)}`;

export function LocationTable({ rows, loading = false }: LocationTableProps) {
  const { t } = useTranslation();
  const compact = useMediaQuery('(max-width: 767px)');

  const columns = useMemo<Array<DataTableColumn<CheckinLocation>>>(
    () => [
      { id: 'name', header: t('checkinLocations.col.name'), className: 'w-64', cell: (place) => <span className="font-medium">{place.name}</span> },
      {
        id: 'address',
        header: t('checkinLocations.col.address'),
        cell: (place) => place.address ?? <span className="text-ink-muted">{t('checkinLocations.noAddress')}</span>,
      },
      { id: 'coordinates', header: t('checkinLocations.col.coordinates'), className: 'w-60', cell: (place) => <span className="tabular-nums whitespace-nowrap">{coordinates(place)}</span> },
      { id: 'radius', header: t('checkinLocations.col.radius'), numeric: true, className: 'w-28', cell: (place) => formatDistance(place.radiusMeters) },
      { id: 'punches', header: t('checkinLocations.col.punches'), numeric: true, className: 'w-40', cell: (place) => formatNumber(place.punchesLast30Days) },
      { id: 'status', header: t('checkinLocations.col.status'), className: 'w-36', cell: (place) => <LocationStatusBadge active={place.active} /> },
      { id: 'actions', header: t('checkinLocations.col.actions'), headerHidden: true, className: 'w-14', cell: (place) => <LocationRowMenu place={place} /> },
    ],
    [t],
  );

  return (
    <DataTable
      caption={t('checkinLocations.caption')}
      columns={columns}
      data={loading ? [] : rows}
      rowKey={(place) => place.id}
      pageSize={PAGE_SIZE}
      loading={loading}
      loadingLabel={t('checkinLocations.loading')}
      variant={compact ? 'compact' : 'default'}
      rows={{
        lead: (place) => (
          <span className="flex flex-col">
            <span className="font-medium">{place.name}</span>
            <span className="text-caption text-ink-muted [overflow-wrap:anywhere]">{place.address ?? t('checkinLocations.noAddress')}</span>
          </span>
        ),
        meta: (place) => (
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-ink-muted">
            <span>{t('checkinLocations.radiusOf', { radius: formatDistance(place.radiusMeters) })}</span>
            <span>{t('checkinLocations.punchesOf', { formatted: formatNumber(place.punchesLast30Days) })}</span>
          </span>
        ),
        metaLabel: t('checkinLocations.col.radius'),
        end: (place) => <LocationStatusBadge active={place.active} />,
        endLabel: t('checkinLocations.col.status'),
        action: (place) => <LocationRowMenu place={place} touch />,
      }}
    />
  );
}
