// The Ca mặc định a unit has: its own, or else the nearest one above it (the backend applies the same rule).
import type { OrgUnitOption } from '@/features/org-unit/api';
import type { UnitDefaultShift } from './assign-api';

export type UnitDefault = { own: string | null; inherited: { unit: OrgUnitOption; shiftId: string } | null };

export function unitDefault(unitId: string, units: readonly OrgUnitOption[], defaults: readonly UnitDefaultShift[]): UnitDefault {
  const byId = new Map(units.map((unit) => [unit.id, unit]));
  const shiftOf = (id: string) => defaults.find((entry) => entry.orgUnitId === id)?.defaultShiftId ?? null;
  const own = shiftOf(unitId);
  if (own) return { own, inherited: null };
  // `seen` stops a loop in bad data.
  const seen = new Set([unitId]);
  for (let parent = byId.get(byId.get(unitId)?.parentId ?? ''); parent && !seen.has(parent.id); parent = byId.get(parent.parentId ?? '')) {
    seen.add(parent.id);
    const shiftId = shiftOf(parent.id);
    if (shiftId) return { own: null, inherited: { unit: parent, shiftId } };
  }
  return { own: null, inherited: null };
}
