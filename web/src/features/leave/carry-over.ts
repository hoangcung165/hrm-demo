// Which days of a request come off the Phép tồn: the days dated up to its last day, in the year of the balance, at
// most what is left of it. The API counts them the same way when it checks a request.
import type { LeaveBalance, LeaveDay } from './api';

export function daysFromCarryOver(days: LeaveDay[], balance: LeaveBalance | null | undefined): number {
  const carry = balance?.carryOver;
  if (!carry) return 0;
  const early = days
    .filter((day) => day.date.startsWith(`${balance.year}-`) && day.date <= carry.expiresOn)
    .reduce((sum, day) => sum + day.value, 0);
  return Math.max(0, Math.min(early, carry.granted - carry.used));
}
