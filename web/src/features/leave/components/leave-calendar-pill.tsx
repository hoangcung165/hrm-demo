// One person's leave in a calendar cell: the name, the type and, for half a day, the half. The status is an icon and
// words for a screen reader, with a solid look for approved and a dashed one for waiting, so colour is not alone.
import { Check, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import type { DayLeave } from '../calendar-model';

export type LeaveCalendarPillProps = { leave: DayLeave };

export function LeaveCalendarPill({ leave }: LeaveCalendarPillProps) {
  const { t } = useTranslation();
  const { entry, part } = leave;
  const approved = entry.status === 'APPROVED';
  const Icon = approved ? Check : Clock;
  return (
    <li
      className={cn(
        'flex min-w-0 items-center gap-1 rounded-sm border px-1.5 py-0.5 text-caption',
        approved ? 'border-transparent bg-brand-blue-soft text-ink' : 'border-dashed border-ink-muted bg-surface text-ink',
      )}
    >
      <Icon aria-hidden="true" className="size-3 shrink-0" />
      <span className="min-w-0 truncate">
        {entry.employee.fullName}
        <span className="text-ink-muted"> · {entry.leaveType.name}{part === 'FULL' ? '' : ` · ${t(`leave.partShort.${part}`)}`}</span>
      </span>
      <span className="sr-only">{t(`leave.status.${entry.status}`)}</span>
    </li>
  );
}
