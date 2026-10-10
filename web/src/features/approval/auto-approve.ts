// When a waiting level approves itself (Tự duyệt), as the inbox shows it: the date, and how many calendar days are
// left, which turns into a warning on the last day.
import { differenceInCalendarDays, parseISO } from 'date-fns';

export type AutoApproveDue = {
  /** Calendar days from today, 0 for today; never below 0 (the job approves it within minutes). */
  daysLeft: number;
  /** One day or less: the row warns. */
  soon: boolean;
};

export function autoApproveDue(dueAt: string, now: Date = new Date()): AutoApproveDue {
  const daysLeft = Math.max(0, differenceInCalendarDays(parseISO(dueAt), now));
  return { daysLeft, soon: daysLeft <= 1 };
}
