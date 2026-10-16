import { addDays, endOfMonth, format, parseISO, startOfMonth } from 'date-fns';
import { companyTodayIso } from '@/lib/company-time';
import { daysInRange } from '@/lib/format';
import type { SalaryProfileSegment } from './salary-profile-api';

export type DatePeriod = { from: string; to: string };
export type PeriodPiece =
  | { kind: 'salary'; from: string; to: string; days: number; segment: SalaryProfileSegment }
  | { kind: 'gap'; from: string; to: string; days: number };

export function initialSalaryPeriod(day = companyTodayIso()): DatePeriod {
  const date = parseISO(day);
  return { from: format(startOfMonth(date), 'yyyy-MM-dd'), to: format(endOfMonth(date), 'yyyy-MM-dd') };
}
export function validPeriod({ from, to }: DatePeriod): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(from) && /^\d{4}-\d{2}-\d{2}$/.test(to)
    && !Number.isNaN(parseISO(from).getTime()) && !Number.isNaN(parseISO(to).getTime())
    && from <= to;
}

/** API returns only salary-backed days. Keep gaps visible instead of stretching salary into uncovered days. */
export function periodPieces(period: DatePeriod, segments: SalaryProfileSegment[]): PeriodPiece[] {
  if (!validPeriod(period)) return [];
  const pieces: PeriodPiece[] = [];
  let cursor = period.from;
  for (const segment of [...segments].sort((a, b) => a.from.localeCompare(b.from))) {
    const from = segment.from < period.from ? period.from : segment.from;
    const to = segment.to > period.to ? period.to : segment.to;
    if (from > to || to < cursor) continue;
    if (cursor < from) {
      const gapTo = format(addDays(parseISO(from), -1), 'yyyy-MM-dd');
      pieces.push({ kind: 'gap', from: cursor, to: gapTo, days: daysInRange(cursor, gapTo) });
    }
    const start = cursor > from ? cursor : from;
    pieces.push({ kind: 'salary', from: start, to, days: daysInRange(start, to), segment });
    cursor = format(addDays(parseISO(to), 1), 'yyyy-MM-dd');
    if (cursor > period.to) break;
  }
  if (cursor <= period.to) {
    pieces.push({ kind: 'gap', from: cursor, to: period.to, days: daysInRange(cursor, period.to) });
  }
  return pieces;
}

export type Allowance = { name: string; amount: number };
export function salaryAllowances(json: string): Allowance[] | null {
  try {
    const value: unknown = JSON.parse(json);
    if (!Array.isArray(value)) return null;
    const rows: Allowance[] = [];
    for (const raw of value) {
      if (!raw || typeof raw !== 'object') return null;
      const item = raw as Record<string, unknown>;
      const name = item.name ?? item.type;
      if (typeof name !== 'string' || typeof item.amount !== 'number' || !Number.isFinite(item.amount) || item.amount < 0) return null;
      rows.push({ name, amount: item.amount });
    }
    return rows;
  } catch { return null; }
}

/** Distinct date fragments can still point to the same salary-source document. */
export function salarySegmentKey(segment: SalaryProfileSegment) {
  return [segment.from, segment.to, segment.sourceAmendmentId ?? segment.sourceContractId ?? 'none'].join(':');
}
export function salaryPeriodStatus(segment: Pick<SalaryProfileSegment, 'from' | 'to'>,
  today = companyTodayIso()): 'past' | 'current' | 'upcoming' {
  if (segment.from > today) return 'upcoming';
  if (segment.to < today) return 'past';
  return 'current';
}
