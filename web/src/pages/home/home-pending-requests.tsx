import { CalendarCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { DashboardWidget } from '@/components/ui/dashboard-widget';
import { LeaveStatusBadge } from '@/features/leave/components/leave-status-badge';
import { formatDays, formatSpan } from '@/features/leave/leave-format';
import { useOpenRequests } from './use-open-requests';

/** How many requests the block lists; the count in its head is the total, and the link leads to all of them. */
const SHOWN = 3;

export type HomePendingRequestsProps = { className?: string };

/** "Đơn đang chờ": the Employee's leave requests that wait for a decision or were returned, each with its status. */
export function HomePendingRequests({ className }: HomePendingRequestsProps) {
  const { t } = useTranslation();
  const { query, open } = useOpenRequests();
  return (
    <DashboardWidget
      title={t('dashboard.employee.requests.title')}
      count={open.length}
      link={{ label: t('dashboard.employee.requests.link'), to: '/leave', ariaLabel: t('dashboard.employee.requests.linkAria') }}
      loading={query.isPending}
      error={query.isError && !query.data ? { title: t('dashboard.employee.requests.loadError'), onRetry: () => void query.refetch() } : undefined}
      empty={query.data && open.length === 0 ? { icon: <CalendarCheck />, title: t('dashboard.employee.requests.empty.title'), text: t('dashboard.employee.requests.empty.text') } : undefined}
      className={className}
    >
      <ul aria-label={t('dashboard.employee.requests.title')}>
        {open.slice(0, SHOWN).map((item) => (
          <li key={item.id} className="border-b border-line last:border-b-0">
            <Link
              to={`/leave/requests/${item.id}`}
              className="flex min-h-14 items-center gap-3 rounded-sm py-2 text-ink no-underline hover:bg-surface-muted focus-visible:shadow-focus-ring"
            >
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-medium">{item.leaveType.name}</span>
                <span className="text-caption text-ink-muted tabular-nums">
                  {formatSpan(t, item.startDate, item.startPart, item.endDate, item.endPart)} · {t('leave.days', { value: formatDays(item.days) })}
                </span>
              </span>
              <LeaveStatusBadge status={item.status} />
            </Link>
          </li>
        ))}
      </ul>
    </DashboardWidget>
  );
}
