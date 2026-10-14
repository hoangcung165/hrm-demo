// The "Ủy quyền duyệt" dialog's values and checks, as drawn: a delegate, a first day from today, a last day not before
// it, and at least one request type. The errors show once the user tried to save.
import { parseISO } from 'date-fns';
import { useState } from 'react';
import type { TFunction } from 'i18next';
import { formatDate } from '@/lib/format';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import type { ApprovalRequestType, EmployeeCard } from './api';
import { useDelegateCandidates, type ApprovalDelegationInput } from './delegation-api';
import { companyTodayIso } from '@/lib/company-time';

export type DelegationErrors = Partial<Record<'delegate' | 'from' | 'to' | 'types', string>>;

export function useDelegationForm(t: TFunction) {
  const today = companyTodayIso();
  const [delegateId, setDelegateId] = useState('');
  const [chosen, setChosen] = useState<EmployeeCard | null>(null);
  const [search, setSearch] = useState('');
  const [engaged, setEngaged] = useState(false);
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState('');
  const [types, setTypes] = useState<ApprovalRequestType[]>([]);
  const [tried, setTried] = useState(false);
  const q = useDebouncedValue(search.trim(), 300);
  const candidates = useDelegateCandidates(q, engaged);
  const found = candidates.data ?? [];
  const listed = chosen && !found.some((c) => c.id === chosen.id) ? [chosen, ...found] : found;

  const errors: DelegationErrors = {};
  if (!delegateId) errors.delegate = t('delegations.dialog.errors.delegate');
  if (!from) errors.from = t('delegations.dialog.errors.fromRequired');
  else if (from < today) errors.from = t('delegations.dialog.errors.fromPast', { today: formatDate(today) });
  if (!to) errors.to = t('delegations.dialog.errors.toRequired');
  else if (from && to < from) errors.to = t('delegations.dialog.errors.toBefore', { from: formatDate(parseISO(from)) });
  if (types.length === 0) errors.types = t('delegations.dialog.errors.types');

  return {
    today,
    delegateId,
    delegate: listed.find((c) => c.id === delegateId) ?? null,
    choose: (id: string) => {
      setDelegateId(id);
      setChosen(listed.find((c) => c.id === id) ?? null);
    },
    options: listed.map((c) => ({ value: c.id, label: [c.fullName, c.code, c.orgUnitName].filter(Boolean).join(' · ') })),
    search,
    setSearch,
    engage: () => setEngaged(true),
    from,
    setFrom,
    to,
    setTo,
    types,
    toggleType: (type: ApprovalRequestType) => setTypes((current) => (current.includes(type) ? current.filter((x) => x !== type) : [...current, type])),
    /** Shown once the user tried to save. */
    errors: tried ? errors : {},
    /** Marks the form as tried; the input when everything is valid. */
    submit: (): ApprovalDelegationInput | null => {
      setTried(true);
      return Object.keys(errors).length ? null : { delegateId, startDate: from, endDate: to, requestTypes: types };
    },
  };
}
