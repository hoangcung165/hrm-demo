import { Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DashboardWidget } from '@/components/ui/dashboard-widget';
import { useLeaveBalances, type LeaveBalanceItem } from '@/features/leave/api';
import { formatDays } from '@/features/leave/leave-format';
import { companyToday } from '@/lib/company-time';
import { cn } from '@/lib/utils';

export type HomeLeaveBalanceProps = { className?: string };

// The figure is the one of the card on `/leave`: the same year, the same `remaining`, the same words.
function BalanceRow({ item }: { item: LeaveBalanceItem }) {
  const { t } = useTranslation();
  const { balance, leaveType } = item;
  const remaining = balance.remaining ?? 0;
  const title = t('leave.balance.title', { type: leaveType.name, year: balance.year });
  const detail = [t('leave.balance.pending', { value: formatDays(balance.pending) }), t('leave.balance.used', { value: formatDays(balance.used) })].join(' · ');
  return (
    <li aria-label={title} className="flex items-center gap-3 border-b border-line py-3 last:border-b-0">
      <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-md bg-brand-teal-soft text-success [&_svg]:size-5 [&_svg]:stroke-[1.5]">
        <Sun />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-body-strong">{title}</span>
        <span className="text-caption text-ink-muted tabular-nums">{detail}</span>
      </span>
      <span className="flex shrink-0 flex-col items-end">
        <span className={cn('text-display tabular-nums', remaining < 0 ? 'text-danger' : 'text-ink')}>{formatDays(remaining)}</span>
        <span className="text-caption text-ink-muted">{remaining < 0 ? t('leave.balance.figureAdvance') : t('leave.balance.figure')}</span>
      </span>
    </li>
  );
}

/** "Số dư phép" of the Employee for this year: what is left of each type with a limit (Phép năm). */
export function HomeLeaveBalance({ className }: HomeLeaveBalanceProps) {
  const { t } = useTranslation();
  const balances = useLeaveBalances(companyToday().getFullYear());
  const limited = balances.data?.items.filter((item) => item.balance.limited) ?? [];
  return (
    <DashboardWidget
      title={t('dashboard.employee.balance.title')}
      link={{ label: t('dashboard.employee.balance.link'), to: '/leave', ariaLabel: t('dashboard.employee.balance.linkAria') }}
      loading={balances.isPending}
      error={balances.isError ? { title: t('dashboard.employee.balance.loadError'), onRetry: () => void balances.refetch() } : undefined}
      empty={balances.data && limited.length === 0 ? { icon: <Sun />, title: t('dashboard.employee.balance.empty.title'), text: t('dashboard.employee.balance.empty.text') } : undefined}
      className={className}
    >
      <ul aria-label={t('dashboard.employee.balance.title')}>
        {limited.map((item) => (
          <BalanceRow key={item.leaveType.id} item={item} />
        ))}
      </ul>
    </DashboardWidget>
  );
}
