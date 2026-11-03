// The unit and the week of Nhập công thủ công live in the URL (`unit`, `from` = the Monday), so a reload or a link
// shows the same grid. Without `from` it is this week; without a unit nothing is asked yet.
import { isValid, parseISO, startOfWeek } from 'date-fns';
import { useSearchParams } from 'react-router';
import { companyToday } from '@/lib/company-time';
import { toIsoDate } from '@/lib/format';
import { stepRange, weekOf } from './daily-model';
import { weekDays } from './manual-model';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

export function useManualFilters(today: Date = companyToday()) {
  const [params, setParams] = useSearchParams();
  const thisWeek = toIsoDate(weekOf(today).from);
  const raw = params.get('from');
  // Any day given is moved to the Monday of its week.
  const from = raw && DAY.test(raw) && isValid(parseISO(raw)) ? toIsoDate(startOfWeek(parseISO(raw), { weekStartsOn: 1 })) : thisWeek;
  const orgUnitId = UUID.test(params.get('unit') ?? '') ? params.get('unit')! : '';
  const todayIso = toIsoDate(today);
  const { days, last } = weekDays(from, todayIso);

  const write = (changes: Record<string, string>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    setParams(next, { replace: true });
  };
  const step = (direction: -1 | 1) => {
    const moved = stepRange(from, days[6]!, direction).from;
    write({ from: moved === thisWeek ? '' : moved });
  };

  return {
    orgUnitId,
    from,
    days,
    /** The last day of the week that can take an entry; null when the whole week is after today. */
    last,
    today: todayIso,
    isThisWeek: from === thisWeek,
    /** A week after this one has no day to enter: the pager stops at this week. */
    canForward: from < thisWeek,
    setUnit: (id: string) => write({ unit: id }),
    back: () => step(-1),
    forward: () => step(1),
    toThisWeek: () => write({ from: '' }),
  };
}

export type ManualFilters = ReturnType<typeof useManualFilters>;
