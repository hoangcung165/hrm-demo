// The sender's balance of the requested type, for the approver: accrued, used, pending, and what is left before
// and after this request. A type without a limit only has the days used and waiting.
import { useTranslation } from 'react-i18next';
import { DetailList, type DetailListItem } from '@/components/ui/detail-list';
import type { LeaveBalance, LeaveRequestDetail } from '../api';
import { formatDate } from '@/lib/format';
import { formatDays } from '../leave-format';

export type LeaveBalanceFactsProps = { request: LeaveRequestDetail; balance: LeaveBalance };

export function LeaveBalanceFacts({ request, balance }: LeaveBalanceFactsProps) {
  const { t } = useTranslation();
  const days = (value: number) => <span className="tabular-nums">{t('leave.days', { value: formatDays(value) })}</span>;
  const items: DetailListItem[] = [];
  if (balance.accrued !== null) items.push({ label: t('leave.approval.accrued'), value: days(balance.accrued) });
  if (balance.carryOver) {
    const { carryOver } = balance;
    items.push({ label: t('leave.approval.carryOver'), value: t('leave.approval.carryOverValue', { remaining: formatDays(carryOver.remaining), granted: formatDays(carryOver.granted), date: formatDate(carryOver.expiresOn) }) });
    if (carryOver.lost > 0) items.push({ label: t('leave.approval.carryOverLost'), value: days(carryOver.lost) });
  }
  items.push({ label: t('leave.approval.used'), value: days(balance.used) });
  items.push({ label: t('leave.approval.pending'), value: days(balance.pending) });
  if (request.remainingBefore !== null) items.push({ label: t('leave.approval.before'), value: days(request.remainingBefore) });
  if (request.remainingAfter !== null) {
    items.push({
      label: t('leave.approval.after'),
      value: <span className={request.remainingAfter < 0 ? 'font-semibold text-danger' : 'font-semibold'}>{t('leave.days', { value: formatDays(request.remainingAfter) })}</span>,
    });
  }
  return (
    <div className="flex flex-col gap-2">
      <DetailList items={items} />
      <p className="text-caption text-ink-muted">{t('leave.approval.balanceNote', { year: balance.year })}</p>
    </div>
  );
}
