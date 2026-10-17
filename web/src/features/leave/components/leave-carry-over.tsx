// The Phép tồn of a year under the Phép năm card: what carried over from the year before, how much of it is left,
// the last day it can be taken and, once that day has passed, what was lost. It is kept apart from the year's own
// figures because it expires; the state is always written, never only coloured.
import { History, TriangleAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatDate } from '@/lib/format';
import type { LeaveCarryOver } from '../api';
import { formatDays } from '../leave-format';

export type LeaveCarryOverProps = { carryOver: LeaveCarryOver; year: number };

export function LeaveCarryOverBlock({ carryOver, year }: LeaveCarryOverProps) {
  const { t } = useTranslation();
  const expired = carryOver.lost > 0 || carryOver.remaining === 0;
  const date = formatDate(carryOver.expiresOn);
  return (
    <section aria-label={t('leave.balance.carry.title', { year: year - 1 })} className="flex flex-col gap-1 rounded-md border border-line bg-surface-muted p-3">
      <h3 className="flex items-center gap-2 text-body font-semibold">
        <History aria-hidden="true" className="size-4 shrink-0 text-ink-muted" />
        {t('leave.balance.carry.title', { year: year - 1 })}
      </h3>
      <p className="tabular-nums">{t('leave.balance.carry.figure', { remaining: formatDays(carryOver.remaining), granted: formatDays(carryOver.granted) })}</p>
      <p className="text-body-small text-ink-muted">
        {t('leave.balance.carry.used', { value: formatDays(carryOver.used) })} · {expired ? t('leave.balance.carry.expired', { date }) : t('leave.balance.carry.until', { date })}
      </p>
      <p className="text-caption text-ink-muted">{t('leave.balance.carry.note')}</p>
      {carryOver.lost > 0 ? (
        <p className="flex items-center gap-2 text-body-small font-semibold">
          <TriangleAlert aria-hidden="true" className="size-4 shrink-0 text-warning" />
          {t('leave.balance.carry.lost', { value: formatDays(carryOver.lost) })}
        </p>
      ) : null}
    </section>
  );
}
