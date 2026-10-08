// "Chọn người khác" for the Quản lý trực tiếp: a search over the active Employees of the company (name or code,
// accents ignored) and a Select of the first 20 matches. The chosen person stays listed while searching.
import type { Ref } from 'react';
import { useTranslation } from 'react-i18next';
import { SearchSelect } from '@/components/ui/search-select';
import type { EmployeeRef } from '../api';
import { useEmployeePicker } from '../use-employee-picker';

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

export function EmployeeManagerPicker({ value, onChange, excludeId, initial, ...field }: EmployeeManagerPickerProps) {
  const { t } = useTranslation();
  const picker = useEmployeePicker({ value, excludeId, initial: initial ? { id: initial.id, fullName: initial.fullName, code: initial.code } : null });
  return (
    <SearchSelect
      {...field}
      value={value}
      onChange={(next) => {
        picker.remember(next);
        onChange(next);
      }}
      options={picker.options}
      search={picker.search}
      onSearch={picker.setSearch}
      onEngage={picker.engage}
      searchLabel={t('employees.create.findManager')}
      placeholder={picker.noMatch ? t('employees.create.noManagerMatch') : t('employees.create.chooseManager')}
    />
  );
}
