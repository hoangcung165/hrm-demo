// A type without a limit (Nghỉ ốm, Không lương…): the days used this year, the days waiting, and its rule.
import { useTranslation } from 'react-i18next';
import type { LeaveBalanceItem } from '../api';
import { formatDays } from '../leave-format';
import type { LeavePolicyValues } from '../policy-api';
import { leaveTypeRule } from '../leave-type-rule';

export type LeaveBalanceSmallProps = { item: LeaveBalanceItem; policy: LeavePolicyValues | null };

export function LeaveBalanceSmall({ item, policy }: LeaveBalanceSmallProps) {
  const { t } = useTranslation();
  const { balance } = item;
  return (
    <section aria-label={item.leaveType.name} className="flex min-w-0 flex-col gap-1 p-4 max-md:py-3 md:gap-2 md:rounded-md md:border md:border-line md:bg-surface">
      <h2 className="text-body-strong">{item.leaveType.name}</h2>
      <p className="flex flex-wrap items-baseline gap-x-2">
        <span className="text-body-strong tabular-nums md:text-title">{formatDays(balance.used)}</span>
        <span className="text-caption text-ink-muted">{t('leave.balance.usedDays')}</span>
        {balance.pending > 0 ? <span className="text-caption text-warning">{t('leave.balance.pendingDays', { value: formatDays(balance.pending) })}</span> : null}
      </p>
      <p className="text-caption text-ink-muted">{leaveTypeRule(t, item, policy)}</p>
    </section>
  );
}
