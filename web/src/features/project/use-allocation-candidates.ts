// The data of the employee picker of the allocate dialog: active Employees found by name or code, loaded once the
// user first focuses the picker, each with the load today. People already allocated to the project are listed but
// cannot be chosen. The chosen person stays listed whatever the search.
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { SelectOption } from '@/components/ui/select';
import { formatDate, formatPercent } from '@/lib/format';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { useAllocationCandidates, type AllocationCandidate } from './allocation-api';

export function useCandidatePicker(projectId: string, value: string) {
  const { t } = useTranslation();
  const [engaged, setEngaged] = useState(false);
  const [search, setSearch] = useState('');
  const q = useDebouncedValue(search.trim(), 300);
  const found = useAllocationCandidates(projectId, q, engaged);
  const [chosen, setChosen] = useState<AllocationCandidate | null>(null);
  const items = found.data ?? [];
  const listed = chosen && chosen.employee.id === value && !items.some((each) => each.employee.id === value) ? [chosen, ...items] : items;
  const label = ({ employee, loadToday, inProjectFrom }: AllocationCandidate) =>
    [employee.fullName, employee.code, inProjectFrom ? t('projects.allocate.alreadyIn', { date: formatDate(inProjectFrom) }) : t('projects.allocate.loadToday', { percent: formatPercent(loadToday) })].join(' · ');
  return {
    search,
    setSearch,
    engage: () => setEngaged(true),
    options: listed.map((each): SelectOption => ({ value: each.employee.id, label: label(each), disabled: each.inProjectFrom !== null && each.employee.id !== value })),
    /** A search that found nobody. */
    noMatch: engaged && Boolean(q) && found.isSuccess && items.length === 0,
    remember: (id: string) => setChosen(listed.find((each) => each.employee.id === id) ?? null),
  };
}
