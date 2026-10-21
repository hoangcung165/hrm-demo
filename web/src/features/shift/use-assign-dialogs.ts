// Which of the two dialogs of the calendar is open ("Phân ca", "Ca mặc định") and where "Phân ca" starts: the visible range
// from today on, or one day when it was opened from that day's drawer. Only an Account with `SHIFT_ASSIGN` gets them.
import { useRef, useState } from 'react';
import { useCurrentAccount } from '@/features/auth/account-context';
import { useRefreshAccount } from '@/features/auth/api';
import { toIsoDate } from '@/lib/format';
import type { ShiftCalendarFilters } from './use-calendar-filters';
import type { AssignStart } from './use-assign-form';

type Open = { dialog: 'assign'; start: AssignStart } | { dialog: 'default' };

export function useAssignDialogs(filters: ShiftCalendarFilters) {
  const allowed = useCurrentAccount().permissions.includes('SHIFT_ASSIGN');
  const refreshAccount = useRefreshAccount();
  const [open, setOpen] = useState<Open | null>(null);
  // The toolbar button: it takes focus back when the button that opened a dialog is gone.
  const toolbarButton = useRef<HTMLButtonElement>(null);
  const { range, today, query } = filters;
  const startOf = (day?: string): AssignStart => {
    const from = day ? new Date(`${day}T00:00:00`) : toIsoDate(today) >= toIsoDate(range.from) && toIsoDate(today) <= toIsoDate(range.to) ? today : range.from;
    return { from, to: day ? from : range.to, orgUnitId: query.orgUnitId, employeeId: query.employeeId };
  };
  return {
    allowed,
    open,
    toolbarButton,
    openAssign: (day?: string) => setOpen({ dialog: 'assign', start: startOf(day) }),
    openDefault: () => setOpen({ dialog: 'default' }),
    close: () => setOpen(null),
    // The permission was taken away meanwhile: reload it, and the calendar turns read-only.
    onDenied: () => void refreshAccount().catch(() => {}),
  };
}

export type AssignDialogs = ReturnType<typeof useAssignDialogs>;
