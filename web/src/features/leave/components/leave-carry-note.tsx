// Under the day breakdown of a request: how many of its days come off the Phép tồn, or what is left of it and until
// when, so the sender knows why the balance after the request is what it is. Nothing when there is no Phép tồn.
import { useTranslation } from 'react-i18next';
import { formatDate } from '@/lib/format';
import type { LeaveBalance, LeaveDay } from '../api';
import { daysFromCarryOver } from '../carry-over';
import { formatDays } from '../leave-format';

export type LeaveCarryNoteProps = { days: LeaveDay[]; balance: LeaveBalance | null | undefined };

export function LeaveCarryNote({ days, balance }: LeaveCarryNoteProps) {
  const { t } = useTranslation();
  const carry = balance?.carryOver;
  if (!carry || carry.remaining <= 0) return null;
  const taken = daysFromCarryOver(days, balance);
  const date = formatDate(carry.expiresOn);
  return (
    <p className="text-body-small text-ink-muted">
      {taken > 0
        ? t('leave.form.carryTaken', { days: formatDays(taken), left: formatDays(Math.max(0, carry.remaining - taken)), date })
        : t('leave.form.carryLeft', { remaining: formatDays(carry.remaining), date })}
    </p>
  );
}
