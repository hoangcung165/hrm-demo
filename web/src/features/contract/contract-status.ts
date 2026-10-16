import { differenceInCalendarDays, parseISO } from 'date-fns';
import { companyTodayIso } from '@/lib/company-time';
import type { EmploymentContract } from './api';

export type ContractState = 'upcoming' | 'current' | 'expiring' | 'ended';

/** Inclusive contract terms, measured on the company's date rather than the browser's. */
export function contractState(contract: Pick<EmploymentContract, 'startsOn' | 'endsOn'>, today = companyTodayIso()): ContractState {
  if (contract.startsOn > today) return 'upcoming';
  if (contract.endsOn !== null && contract.endsOn < today) return 'ended';
  if (contract.endsOn !== null && differenceInCalendarDays(parseISO(contract.endsOn), parseISO(today)) <= 30) return 'expiring';
  return 'current';
}

/** Current contract first, then upcoming contracts and historical contracts. */
export function groupContracts(rows: EmploymentContract[], today = companyTodayIso()) {
  const current: EmploymentContract[] = [];
  const other: EmploymentContract[] = [];
  for (const row of rows) {
    const state = contractState(row, today);
    (state === 'current' || state === 'expiring' ? current : other).push(row);
  }
  return { current, other };
}
