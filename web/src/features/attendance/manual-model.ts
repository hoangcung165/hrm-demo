// What the Nhập công thủ công screen computes: the week shown and the part of it that can take an entry (no day after
// today), what each cell holds, and what one dialog is about (a cell, a person's week, a day of the unit, or all of it).
import { addDays, parseISO } from 'date-fns';
import { toIsoDate } from '@/lib/format';
import type { ManualKind } from './daily-api';
import type { ManualEntryItem, ManualRow, ManualTarget } from './manual-api';

/** The seven days of the week from `from`, and the last of them a request may name (today at the latest). */
export function weekDays(from: string, today: string): { days: string[]; last: string | null } {
  const days = Array.from({ length: 7 }, (_, index) => toIsoDate(addDays(parseISO(from), index)));
  const open = days.filter((day) => day <= today);
  return { days, last: open.at(-1) ?? null };
}

/** A cell: no shift that day, a day after today, nothing entered yet, or the entry. */
export type ManualCell = { state: 'noShift' } | { state: 'future' } | { state: 'empty' } | { state: 'entry'; entry: ManualEntryItem };

export function cellOf(row: ManualRow, date: string, today: string): ManualCell {
  if (date > today) return { state: 'future' };
  if (!row.shiftDays.includes(date)) return { state: 'noShift' };
  const entry = row.entries.find((each) => each.date === date);
  return entry ? { state: 'entry', entry } : { state: 'empty' };
}

/** What one dialog is for. */
export type ManualScope =
  | { kind: 'cell'; row: ManualRow; date: string }
  | { kind: 'row'; row: ManualRow }
  | { kind: 'day'; date: string }
  | { kind: 'all' };

/** The request body's target and days for a scope, within `from` to `last`. */
export function requestOf(scope: ManualScope, orgUnitId: string, from: string, last: string): ManualTarget & { from: string; to: string; days?: string[] } {
  switch (scope.kind) {
    case 'cell':
      return { employeeIds: [scope.row.employee.id], from: scope.date, to: scope.date };
    case 'row':
      return { employeeIds: [scope.row.employee.id], from, to: last };
    case 'day':
      return { orgUnitId, from: scope.date, to: scope.date };
    case 'all':
      return { orgUnitId, from, to: last };
  }
}

/** The entries a scope covers among the rows shown, for "Xóa" and to fill the form with a single existing entry. */
export function entriesIn(scope: ManualScope, rows: ManualRow[], from: string, last: string): ManualEntryItem[] {
  const inRange = (entry: ManualEntryItem) => entry.date >= from && entry.date <= last;
  switch (scope.kind) {
    case 'cell':
      return scope.row.entries.filter((entry) => entry.date === scope.date);
    case 'row':
      return scope.row.entries.filter(inRange);
    case 'day':
      return rows.flatMap((row) => row.entries.filter((entry) => entry.date === scope.date));
    case 'all':
      return rows.flatMap((row) => row.entries.filter(inRange));
  }
}

/** The values the form opens with: the one entry of the scope when all of it is that entry, else Đủ công. */
export function initialValues(entries: ManualEntryItem[]): { kind: ManualKind; in: string; out: string; note: string } {
  const first = entries[0];
  const same = first && entries.every((entry) => entry.kind === first.kind && entry.in === first.in && entry.out === first.out && entry.note === first.note);
  if (!first || !same) return { kind: 'FULL', in: '08:00', out: '17:00', note: '' };
  return { kind: first.kind, in: first.in ?? '08:00', out: first.out ?? '17:00', note: first.note ?? '' };
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
export const isTime = (value: string) => TIME.test(value);
