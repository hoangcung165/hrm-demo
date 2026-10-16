// "Thông báo cho (CC)": people told about the request who do not approve it, up to 10. A search over the active
// Employees, loaded once the user first focuses it; each pick becomes a chip that can be removed.
import { X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Field } from '@/components/ui/field';
import { SearchSelect } from '@/components/ui/search-select';
import type { EmployeeCard } from '@/features/approval/api';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { useCcCandidates } from '../request-api';
import { CC_MAX } from '../use-leave-form';

export type LeaveCcFieldProps = {
  value: EmployeeCard[];
  onAdd: (person: EmployeeCard) => void;
  onRemove: (id: string) => void;
};

const labelOf = (person: EmployeeCard) => [person.fullName, person.code, person.orgUnitName].filter(Boolean).join(' · ');

export function LeaveCcField({ value, onAdd, onRemove }: LeaveCcFieldProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [engaged, setEngaged] = useState(false);
  const q = useDebouncedValue(search.trim(), 300);
  const found = useCcCandidates(q, engaged);
  const options = (found.data ?? []).filter((person) => !value.some((each) => each.id === person.id));
  const full = value.length >= CC_MAX;
  return (
    <Field label={t('leave.cc.label')} helper={t('leave.cc.helper', { max: CC_MAX })}>
      {(control) => (
        <div className="flex flex-col gap-2">
          {value.length ? (
            <ul aria-label={t('leave.cc.chosen')} className="flex flex-wrap gap-2">
              {value.map((person) => (
                <li key={person.id} className="inline-flex h-8 items-center gap-1 rounded-full border border-line bg-surface-muted pr-1 pl-3 text-body-small">
                  {person.fullName}
                  <button
                    type="button"
                    aria-label={t('leave.cc.remove', { name: person.fullName })}
                    onClick={() => onRemove(person.id)}
                    className="grid size-6 place-items-center rounded-full text-ink-muted hover:bg-surface hover:text-ink focus-visible:shadow-focus-ring [&_svg]:size-4 [&_svg]:stroke-[1.5]"
                  >
                    <X aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <SearchSelect
            id={control.id}
            aria-describedby={control['aria-describedby']}
            value=""
            onChange={(id) => {
              const person = options.find((each) => each.id === id);
              if (person) onAdd(person);
            }}
            options={options.map((person) => ({ value: person.id, label: labelOf(person) }))}
            search={search}
            onSearch={setSearch}
            searchLabel={t('leave.cc.search')}
            placeholder={full ? t('leave.cc.full', { max: CC_MAX }) : t('leave.cc.placeholder')}
            onEngage={() => setEngaged(true)}
            disabled={full}
          />
        </div>
      )}
    </Field>
  );
}
