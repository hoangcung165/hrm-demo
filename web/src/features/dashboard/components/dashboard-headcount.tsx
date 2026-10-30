// "Nhân viên theo đơn vị" (Bar list) and "Vào làm và nghỉ việc" (Paired columns), from GET /api/dashboard/headcount.
// One request feeds both widgets; each keeps its own head, so a failure shows in both with the same retry.
import { Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { BarList } from '@/components/ui/bar-list';
import { DashboardWidget } from '@/components/ui/dashboard-widget';
import { PairedColumns } from '@/components/ui/paired-columns';
import { useCurrentAccount } from '@/features/auth/account-context';
import { useDashboardHeadcount } from '../headcount-api';
import { flowTotals, monthPeriods, totalOf, unitRows } from '../headcount-rows';

export function DashboardHeadcount() {
  const { t } = useTranslation();
  const { permissions } = useCurrentAccount();
  const query = useDashboardHeadcount(true);
  const data = query.data;
  const loading = query.isPending;
  const error = query.isError && !data ? { onRetry: () => void query.refetch() } : undefined;
  const totals = data ? flowTotals(data.months) : { joins: 0, leaves: 0 };
  const quiet = data !== undefined && totals.joins === 0 && totals.leaves === 0;
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <DashboardWidget
        title={t('dashboard.headcount.units.title')}
        count={data ? totalOf(data.byUnit) : undefined}
        link={permissions.includes('ORG_VIEW') ? { label: t('dashboard.headcount.units.link'), to: '/org' } : undefined}
        loading={loading}
        error={error ? { title: t('dashboard.headcount.units.loadError'), ...error } : undefined}
        empty={data && data.byUnit.length === 0 ? { icon: <Users />, title: t('dashboard.headcount.units.empty.title'), text: t('dashboard.headcount.units.empty.text') } : undefined}
      >
        {data ? <BarList label={t('dashboard.headcount.units.title')} rows={unitRows(t, data.byUnit)} /> : null}
      </DashboardWidget>
      <DashboardWidget
        title={t('dashboard.headcount.flow.title')}
        description={t('dashboard.headcount.flow.description')}
        loading={loading}
        error={error ? { title: t('dashboard.headcount.flow.loadError'), ...error } : undefined}
        empty={quiet ? { icon: <Users />, title: t('dashboard.headcount.flow.empty.title'), text: t('dashboard.headcount.flow.empty.text') } : undefined}
      >
        {data ? (
          <PairedColumns
            label={t('dashboard.headcount.flow.label', totals)}
            periods={monthPeriods(t, data.months)}
            seriesA={t('dashboard.headcount.flow.joins')}
            seriesB={t('dashboard.headcount.flow.leaves')}
          />
        ) : null}
      </DashboardWidget>
    </div>
  );
}
