// The state of the "Phân ca" dialog: what to do (assign or clear), to whom, which shift, which days; what that would do
// (worked out from the calendar of the range); the checks before saving; and the save with its toast. Nothing is
// sent until the checks pass, and a failure stays in the dialog as a sentence with its cause and fix.
import { differenceInCalendarDays } from 'date-fns';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { DateRangeValue } from '@/components/ui/date-range-picker';
import { useToast } from '@/components/ui/use-toast';
import { ApiError } from '@/lib/api';
import { formatNumber, toIsoDate } from '@/lib/format';
import { useAssignShifts, useClearShifts, type Weekday } from './assign-api';
import { assignProblem, type AssignProblem } from './assign-errors';
import { previewAssign, previewClear } from './assign-model';
import { CALENDAR_MAX_SIZE, useShiftCalendar } from './calendar-api';

export type AssignMode = 'ASSIGN' | 'CLEAR';
export type TargetKind = 'UNIT' | 'PEOPLE';

/** Where the dialog starts: a range, and the unit and person the calendar was filtered by (`''` for none). */
export type AssignStart = { from: Date; to: Date; orgUnitId: string; employeeId: string };

/** The longest range one call takes (the backend's limit). */
export const MAX_ASSIGN_DAYS = 62;

export type AssignFormProps = { start: AssignStart; shiftCode: (id: string) => string; onDone: () => void; onDenied: () => void };

export function useAssignForm({ start, shiftCode, onDone, onDenied }: AssignFormProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const assigning = useAssignShifts();
  const clearing = useClearShifts();
  const [mode, setMode] = useState<AssignMode>('ASSIGN');
  const [kind, setKind] = useState<TargetKind>(start.employeeId || !start.orgUnitId ? 'PEOPLE' : 'UNIT');
  const [orgUnitId, setOrgUnitId] = useState(start.orgUnitId);
  const [people, setPeople] = useState<ReadonlySet<string>>(new Set(start.employeeId ? [start.employeeId] : []));
  const [shiftId, setShiftId] = useState('');
  const [range, setRange] = useState<DateRangeValue>({ from: start.from, to: start.to });
  const [weekdays, setWeekdays] = useState<Weekday[]>([]);
  const [attempted, setAttempted] = useState(false);
  const [problem, setProblem] = useState<AssignProblem | null>(null);

  const days = range.from && range.to ? differenceInCalendarDays(range.to, range.from) + 1 : 0;
  const rangeError = !range.from || !range.to ? 'shiftAssign.error.rangeRequired' : days < 1 ? 'shiftAssign.error.rangeOrder' : days > MAX_ASSIGN_DAYS ? 'shiftAssign.error.rangeTooLong' : null;
  const errors = {
    shift: mode === 'ASSIGN' && !shiftId ? 'shiftAssign.error.shiftRequired' : null,
    unit: kind === 'UNIT' && !orgUnitId ? 'shiftAssign.error.unitRequired' : null,
    people: kind === 'PEOPLE' && people.size === 0 ? 'shiftAssign.error.peopleRequired' : null,
    range: rangeError,
  };

  // Who is on the calendar of the range: the whole unit, or the people of the chosen unit (the Account's scope without one).
  const query = { from: range.from ? toIsoDate(range.from) : '', to: range.to ? toIsoDate(range.to) : '', orgUnitId, employeeId: '', shiftId: '', page: 0, size: CALENDAR_MAX_SIZE };
  const calendar = useShiftCalendar(query, rangeError === null && (kind === 'PEOPLE' || orgUnitId !== ''));
  const data = calendar.data && calendar.data.from === query.from && calendar.data.to === query.to ? calendar.data : undefined;
  const chosen = kind === 'UNIT' ? null : people;
  let preview: ReturnType<typeof previewAssign> | ReturnType<typeof previewClear> | undefined;
  if (data && mode === 'CLEAR') preview = previewClear(data, chosen);
  else if (data && shiftId) preview = previewAssign(data, chosen, shiftId, weekdays);

  const submit = async () => {
    setAttempted(true);
    if (Object.values(errors).some(Boolean) || !range.from || !range.to) return;
    setProblem(null);
    const target = kind === 'UNIT' ? { orgUnitId } : { employeeIds: [...people] };
    const dates = { from: toIsoDate(range.from), to: toIsoDate(range.to) };
    try {
      if (mode === 'ASSIGN') {
        const result = await assigning.mutateAsync({ shiftId, ...target, ...dates, weekdays: weekdays.length > 0 ? weekdays : undefined });
        const detail = t('shiftAssign.done.detail', { created: formatNumber(result.created), replaced: formatNumber(result.replaced), unchanged: formatNumber(result.unchanged) });
        toast({ variant: 'success', message: t('shiftAssign.done.assign', { code: shiftCode(shiftId), count: result.employees }), detail });
      } else {
        const result = await clearing.mutateAsync({ ...target, ...dates });
        toast({ variant: 'success', message: t('shiftAssign.done.clear', { removed: formatNumber(result.removed), count: result.employees }) });
      }
      onDone();
    } catch (error) {
      setProblem(assignProblem(error));
      if (error instanceof ApiError && error.status === 403 && error.code !== 'shift_assignment.out_of_scope') onDenied();
    }
  };

  return {
    mode, setMode: (next: AssignMode) => { setMode(next); setProblem(null); },
    kind, setKind: (next: TargetKind) => { setKind(next); setProblem(null); },
    orgUnitId, setOrgUnitId: (id: string) => { setOrgUnitId(id); setPeople(new Set()); setProblem(null); },
    people, setPeople,
    shiftId, setShiftId,
    range, setRange,
    weekdays, setWeekdays,
    // A range that is too long is said at once; the rest only after the first try to save.
    errors: attempted ? errors : { shift: null, unit: null, people: null, range: days > MAX_ASSIGN_DAYS ? rangeError : null },
    problem,
    calendar: { data, loading: calendar.isFetching && !data, failed: calendar.isError, total: calendar.data?.total ?? 0 },
    preview,
    saving: assigning.isPending || clearing.isPending,
    submit,
  };
}

export type AssignForm = ReturnType<typeof useAssignForm>;
