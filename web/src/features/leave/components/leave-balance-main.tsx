// The Leave balance card of a type with a limit (Phép năm): what is left in large figures, the bar of used, pending,
// remaining and what may still be advanced, and how much has accrued. A negative balance (advance taken) is said
// in a warning under the card's numbers.
import { Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Alert } from '@/components/ui/alert';
import { BalanceCard } from '@/components/ui/balance-card';
import type { LeaveBalanceItem } from '../api';
import { formatDays } from '../leave-format';
import { LeaveCarryOverBlock } from './leave-carry-over';
import type { LeavePolicyValues } from '../policy-api';

export type LeaveBalanceMainProps = {
  item: LeaveBalanceItem;
  policy: LeavePolicyValues | null;
  /** The month the accrual counts to (1-12), in the year shown; null for a past or future year. */
  month: number | null;
};

export function LeaveBalanceMain({ item, policy, month }: LeaveBalanceMainProps) {
  const { t } = useTranslation();
  const { balance, leaveType } = item;
  const remaining = balance.remaining ?? 0;
  const values = { used: formatDays(balance.used), pending: formatDays(balance.pending), remaining: formatDays(Math.max(0, remaining)), advance: formatDays(balance.advanceAvailable) };
  const segments = [
    { tone: 'used' as const, value: balance.used, text: t('leave.balance.used', { value: values.used }) },
    { tone: 'pending' as const, value: balance.pending, text: t('leave.balance.pending', { value: values.pending }) },
    { tone: 'remaining' as const, value: Math.max(0, remaining), text: t('leave.balance.remaining', { value: values.remaining }) },
    ...(balance.advanceAvailable > 0 ? [{ tone: 'room' as const, value: balance.advanceAvailable, text: t('leave.balance.advance', { value: values.advance }) }] : []),
  ];
  const rule = policy?.accrual === 'YEARLY' ? 'leave.balance.ruleYearly' : 'leave.balance.ruleMonthly';
  const accruedLine = balance.accrued !== null && month !== null && policy?.accrual === 'MONTHLY';
  return (
    <BalanceCard
      icon={<Sun />}
      title={t('leave.balance.title', { type: leaveType.name, year: balance.year })}
      caption={balance.entitled !== null ? t(rule, { days: formatDays(balance.entitled) }) : undefined}
      figure={formatDays(remaining)}
      figureLabel={remaining < 0 ? t('leave.balance.figureAdvance') : t('leave.balance.figure')}
      negative={remaining < 0}
      segments={segments}
      barLabel={t(balance.advanceAvailable > 0 ? 'leave.balance.barWithAdvance' : 'leave.balance.bar', { type: leaveType.name, year: balance.year, ...values })}
    >
      {accruedLine ? <p className="text-body-small text-ink-muted">{t('leave.balance.accrued', { days: formatDays(balance.accrued!), month })}</p> : null}
      {balance.carryOver ? <LeaveCarryOverBlock carryOver={balance.carryOver} year={balance.year} /> : null}
      {remaining < 0 ? (
        <Alert variant="warning" title={t('leave.balance.negativeTitle', { days: formatDays(-remaining), type: leaveType.name })}>
          {t('leave.balance.negativeText')}
        </Alert>
      ) : null}
    </BalanceCard>
  );
}
