// The data of an Employee picker (Quản lý trực tiếp, Trưởng đơn vị, the Employee of an Account): a search over the
// active Employees of the company, by name or code, loaded once the user first focuses the picker. The chosen
// person (or the one the record had) stays listed whatever the search.
import { useState } from 'react';
import type { SelectOption } from '@/components/ui/select';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import type { EmployeeOption } from './api';
import { useEmployeeOptions } from './form-api';

/** A person the picker shows: from the search, or the one the record already had. */
export type PickedEmployee = { id: string; fullName: string; code: string | null; detail?: string | null };

const pickedOf = (option: EmployeeOption): PickedEmployee => ({ id: option.id, fullName: option.fullName, code: option.code, detail: option.positionName });
const labelOf = (person: PickedEmployee) => [person.fullName, person.code, person.detail].filter(Boolean).join(' · ');

export type EmployeePickerOptions = {
  value: string;
  /** The person the record has now, listed before any search. */
  initial?: PickedEmployee | null;
  /** The Employee being edited, who cannot be chosen. */
  excludeId?: string;
};

export function useEmployeePicker({ value, initial, excludeId }: EmployeePickerOptions) {
  const [engaged, setEngaged] = useState(false);
  const [search, setSearch] = useState('');
  const q = useDebouncedValue(search.trim(), 300);
  const found = useEmployeeOptions(q, excludeId, engaged);
  const [chosen, setChosen] = useState<PickedEmployee | null>(initial ?? null);
  const items = (found.data ?? []).map(pickedOf);
  const listed = chosen && chosen.id === value && !items.some((each) => each.id === value) ? [chosen, ...items] : items;
  return {
    search,
    setSearch,
    engage: () => setEngaged(true),
    options: listed.map((each): SelectOption => ({ value: each.id, label: labelOf(each) })),
    /** A search that found nobody. */
    noMatch: engaged && Boolean(q) && found.isSuccess && items.length === 0,
    /** Remembers who was chosen, so they stay listed while the user searches on. */
    remember: (id: string) => setChosen(listed.find((each) => each.id === id) ?? null),
  };
}
