// "Nghỉ hôm nay": who is off today in the caller's scope, with the leave type and the part of the day or the last day.
// The head opens the leave calendar on this week, as the tile does.
import { CalendarDays } from 'lucide-react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Avatar } from '@/components/ui/avatar';
import { DashboardList } from '@/components/ui/dashboard-list';
import { DashboardListRow } from '@/components/ui/dashboard-list-row';
import { DashboardWidget } from '@/components/ui/dashboard-widget';
import { companyTodayIso } from '@/lib/company-time';
import { useDashboardLeaveToday } from '../leave-today-api';
import { leavePartLabel } from '../leave-today-labels';

/** A block holds at most five rows; the count in its head is the total. */
const ROWS = 5;

export function DashboardLeaveToday() {
  const { t } = useTranslation();
  const query = useDashboardLeaveToday(true);
  const data = query.data;
  const day = data?.date ?? companyTodayIso();
  return (
    <DashboardWidget
      title={t('dashboard.leaveToday.title')}
      count={data?.entries.length}
      link={{ label: t('dashboard.leaveToday.link'), to: `/leave-calendar?view=week&date=${day}`, ariaLabel: t('dashboard.leaveToday.linkAria') }}
      loading={query.isPending}
      error={query.isError && !data ? { title: t('dashboard.leaveToday.loadError'), onRetry: () => void query.refetch() } : undefined}
      empty={data && data.entries.length === 0 ? { icon: <CalendarDays />, title: t('dashboard.leaveToday.empty.title'), text: t('dashboard.leaveToday.empty.text') } : undefined}
    >
      <DashboardList label={t('dashboard.leaveToday.title')}>
        {(data?.entries ?? []).slice(0, ROWS).map((entry) => (
          <DashboardListRow
            key={entry.requestId}
            lead={<Avatar name={entry.employee.fullName} />}
            title={<Link to={`/employees/${entry.employee.id}`}>{entry.employee.fullName}</Link>}
            sub={entry.employee.orgUnitName ?? undefined}
            end={entry.leaveType.name}
            endSub={leavePartLabel(t, entry, data?.date)}
          />
        ))}
      </DashboardList>
    </DashboardWidget>
  );
}
