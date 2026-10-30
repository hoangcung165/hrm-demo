// "Sắp hết hạn": the next contracts, probation ends, visas, work permits and certificates, soonest first, each with the
// days left. The window is the warning days of each type in the settings (HRM-14), applied by the API.
import { CalendarClock } from 'lucide-react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { DashboardIconMark } from '@/components/ui/dashboard-icon-mark';
import { DashboardList } from '@/components/ui/dashboard-list';
import { DashboardListRow } from '@/components/ui/dashboard-list-row';
import { DashboardWidget } from '@/components/ui/dashboard-widget';
import { useDashboardExpiry } from '../expiry-api';
import { expiryIcon, expiryLeft, expirySentence, expiryTone } from '../expiry-labels';

export function DashboardExpiry() {
  const { t } = useTranslation();
  const query = useDashboardExpiry(true);
  const data = query.data;
  return (
    <DashboardWidget
      title={t('dashboard.expiry.title')}
      description={t('dashboard.expiry.description')}
      count={data?.total}
      link={{ label: t('dashboard.expiry.link'), to: '/expiry', ariaLabel: t('dashboard.expiry.linkAria') }}
      loading={query.isPending}
      error={query.isError && !data ? { title: t('dashboard.expiry.loadError'), onRetry: () => void query.refetch() } : undefined}
      empty={data && data.items.length === 0 ? { icon: <CalendarClock />, title: t('dashboard.expiry.empty.title'), text: t('dashboard.expiry.empty.text') } : undefined}
    >
      <DashboardList label={t('dashboard.expiry.title')}>
        {(data?.items ?? []).map((item) => (
          <DashboardListRow
            key={`${item.type}-${item.sourceId}`}
            lead={<DashboardIconMark>{expiryIcon(item.type)}</DashboardIconMark>}
            title={
              <Link to={item.sourcePath} aria-label={t('expiry.openSource', { source: item.sourceName || t(`expiry.type.${item.type}`), employee: item.employeeName })}>
                {item.employeeName}
              </Link>
            }
            sub={expirySentence(t, item)}
            end={<Badge variant={expiryTone(item.type)}>{expiryLeft(t, item.daysRemaining)}</Badge>}
          />
        ))}
      </DashboardList>
    </DashboardWidget>
  );
}
