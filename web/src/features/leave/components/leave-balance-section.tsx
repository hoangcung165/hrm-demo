// "Số dư phép" of the caller for a year: a Leave balance card per type with a limit, small cards for the others;
// Skeletons while loading and an error with retry. The policies add the rule lines (accrual, files, days per request).
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { companyToday } from '@/lib/company-time';
import type { LeaveBalances } from '../api';
import type { LeavePolicyValues } from '../policy-api';
import { LeaveBalanceMain } from './leave-balance-main';
import { LeaveBalanceSmall } from './leave-balance-small';

export type LeaveBalanceSectionProps = {
  balances: LeaveBalances | undefined;
  /** The policy in force of each type, by type id. */
  policies: Map<string, LeavePolicyValues>;
  error: boolean;
  onRetry: () => void;
};

export function LeaveBalanceSection({ balances, policies, error, onRetry }: LeaveBalanceSectionProps) {
  const { t } = useTranslation();
  if (error) {
    return (
      <Card bare>
        <ErrorState title={t('leave.balance.loadError')} description={t('state.errorHint')} onRetry={onRetry} />
      </Card>
    );
  }
  if (!balances) {
    return (
      <section aria-busy="true" aria-label={t('leave.balance.loading')} className="grid gap-4 md:grid-cols-[minmax(0,1.4fr)_minmax(0,2fr)]">
        <div className="flex flex-col gap-3 rounded-md border border-line bg-surface p-6">
          <Skeleton shape="title" className="w-40" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="w-2/3" />
        </div>
        <div className="grid grid-cols-2 gap-4 max-md:hidden">
          {[0, 1].map((key) => (
            <div key={key} className="flex flex-col gap-2 rounded-md border border-line bg-surface p-4">
              <Skeleton className="w-24" />
              <Skeleton shape="title" className="w-12" />
            </div>
          ))}
        </div>
      </section>
    );
  }
  const today = companyToday();
  const month = today.getFullYear() === balances.year ? today.getMonth() + 1 : null;
  const limited = balances.items.filter((item) => item.balance.limited);
  const others = balances.items.filter((item) => !item.balance.limited);
  return (
    <div className="grid items-start gap-4 md:grid-cols-[minmax(0,1.4fr)_minmax(0,2fr)]">
      <div className="flex flex-col gap-4">
        {limited.map((item) => (
          <LeaveBalanceMain key={item.leaveType.id} item={item} policy={policies.get(item.leaveType.id) ?? null} month={month} />
        ))}
      </div>
      {others.length ? (
        // At 390 the types without a limit are one list (artboard `#18 Nghỉ phép của tôi (390)`).
        <div className="grid divide-y divide-line rounded-md border border-line bg-surface md:grid-cols-2 md:gap-4 md:divide-y-0 md:border-0 md:bg-transparent">
          {others.map((item) => (
            <LeaveBalanceSmall key={item.leaveType.id} item={item} policy={policies.get(item.leaveType.id) ?? null} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
