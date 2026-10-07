// "Chọn người khác" for the Quản lý trực tiếp: a search box over the active Employees of the company (name or
// code, accents ignored) and a Select of the first 20 matches. The chosen person stays listed while searching.
import { Search } from 'lucide-react';
import { useState, type Ref } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import type { EmployeeOption, EmployeeRef } from '../api';
import { useEmployeeOptions } from '../form-api';

export type EmployeeManagerPickerProps = {
  value: string;
  onChange: (id: string) => void;
  id?: string;
  invalid?: boolean;
  'aria-describedby'?: string;
  ref?: Ref<HTMLButtonElement>;
  /** On edit: the Employee being edited, left out of the choices. */
  excludeId?: string;
  /** On edit: the manager chosen before, listed until another is chosen. */
  initial?: EmployeeRef | null;
};

const describe = (option: EmployeeOption | EmployeeRef) => [option.fullName, option.code, 'positionName' in option ? option.positionName : null].filter(Boolean).join(' · ');

export function EmployeeManagerPicker({ value, onChange, id, invalid, ref, excludeId, initial, ...aria }: EmployeeManagerPickerProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const q = useDebouncedValue(search.trim(), 300);
  const options = useEmployeeOptions(q, excludeId);
  const [chosen, setChosen] = useState<EmployeeOption | EmployeeRef | null>(initial ?? null);
  const items = options.data ?? [];
  const listed = chosen && chosen.id === value && !items.some((each) => each.id === value) ? [chosen, ...items] : items;
  return (
    <div className="flex flex-col gap-2 md:flex-row">
      <Input
        type="search"
        aria-label={t('employees.create.findManager')}
        placeholder={t('employees.create.findManager')}
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        leading={<Search aria-hidden="true" />}
        wrapperClassName="md:w-64 max-md:h-11"
      />
      <Select
        {...aria}
        id={id}
        ref={ref}
        invalid={invalid}
        value={value}
        onChange={(next) => {
          setChosen(listed.find((each) => each.id === next) ?? null);
          onChange(next);
        }}
        options={listed.map((each) => ({ value: each.id, label: describe(each) }))}
        placeholder={items.length === 0 && q ? t('employees.create.noManagerMatch') : t('employees.create.chooseManager')}
        className="min-w-0 flex-1 max-md:h-11"
      />
    </div>
  );
}
