// The one-line rule of a type without a limit, for its small card and its radio card: who pays, whether it needs a
// file, the most days per request.
import type { TFunction } from 'i18next';
import type { LeaveBalanceItem } from './api';
import { formatDays } from './leave-format';
import type { LeavePolicyValues } from './policy-api';

export function leaveTypeRule(t: TFunction, item: Pick<LeaveBalanceItem, 'pay' | 'attachmentRequired'>, policy: LeavePolicyValues | null): string {
  const parts = [t(`leave.pay.${item.pay}`)];
  if (item.attachmentRequired) parts.push(t('leave.rule.attachment'));
  if (policy?.maxDaysPerRequest) parts.push(t('leave.rule.maxPerRequest', { days: formatDays(policy.maxDaysPerRequest) }));
  return parts.join(' · ');
}
