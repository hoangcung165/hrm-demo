// The body of Nhập công thủ công: the toolbar, then the grid of the chosen unit and week with its states (no unit yet,
// loading, failed, denied, nobody in the unit), and the dialog it opens.
import { Building2, ShieldOff, Users } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Loading } from '@/components/ui/loading';
import { StateBlock } from '@/components/ui/state-block';
import { useScopedUnits } from '@/features/shift/use-scoped-units';
import { ApiError } from '@/lib/api';
import { formatDateRange } from '@/lib/format';
import { useManualAttendance } from '../manual-api';
import type { ManualScope } from '../manual-model';
import type { ManualFilters } from '../use-manual-filters';
import { ManualDialog } from './manual-dialog';
import { ManualGrid } from './manual-grid';
import { ManualToolbar } from './manual-toolbar';

export function ManualContent({ filters }: { filters: ManualFilters }) {
  const { t } = useTranslation();
  const { units } = useScopedUnits();
  const [scope, setScope] = useState<ManualScope | null>(null);
  const last = filters.last ?? filters.from;
  const query = useManualAttendance({ orgUnitId: filters.orgUnitId, from: filters.from, to: last });
  const unitName = units.find((unit) => unit.id === filters.orgUnitId)?.name ?? '';
  const rows = query.data?.rows ?? [];

  let body;
  if (!filters.orgUnitId) {
    body = <EmptyState icon={<Building2 />} title={t('attendanceManual.noUnit.title')} description={t('attendanceManual.noUnit.text')} />;
  } else if (query.isError) {
    body =
      query.error instanceof ApiError && query.error.status === 403 ? (
        <StateBlock variant="denied" icon={<ShieldOff />} title={t('attendanceManual.denied.title')} description={t('attendanceManual.denied.text')} />
      ) : (
        <ErrorState title={t('attendanceManual.loadError')} onRetry={() => void query.refetch()} />
      );
  } else if (!query.data) {
    body = <Loading rows={5} label={t('attendanceManual.loading')} />;
  } else if (rows.length === 0) {
    body = <EmptyState icon={<Users />} title={t('attendanceManual.empty.title')} description={t('attendanceManual.empty.text')} />;
  }

  return (
    <div className="flex flex-col gap-4" aria-busy={query.isFetching || undefined}>
      <ManualToolbar filters={filters} />
      {body ? (
        <Card bare>{body}</Card>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <p className="flex-1 text-body-small text-ink-muted">{t('attendanceManual.legend')}</p>
            <Button onClick={() => setScope({ kind: 'all' })}>{t('attendanceManual.forAll')}</Button>
          </div>
          <ManualGrid rows={rows} days={filters.days} today={filters.today} caption={t('attendanceManual.caption', { unit: unitName, range: formatDateRange(filters.days[0]!, filters.days[6]!) })} onOpen={setScope} />
        </>
      )}
      {scope ? <ManualDialog scope={scope} rows={rows} orgUnitId={filters.orgUnitId} unitName={unitName} from={filters.from} last={last} onClose={() => setScope(null)} /> : null}
    </div>
  );
}
