// "Nhân viên" of the allocate dialog. Adding: a search over the active Employees with their load today; people
// already in the project are listed but disabled. Editing: the Employee is fixed, shown read-only.
import { useController, useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Field } from '@/components/ui/field';
import { SearchSelect } from '@/components/ui/search-select';
import { Select } from '@/components/ui/select';
import type { Allocation } from '../api';
import type { AllocationFormValues } from '../allocation-schemas';
import { useCandidatePicker } from '../use-allocation-candidates';

export type AllocationEmployeeFieldProps = {
  projectId: string;
  /** The allocation being edited: its Employee cannot change. */
  fixed?: Allocation;
  className?: string;
};

const noChange = () => {};

export function AllocationEmployeeField({ projectId, fixed, className }: AllocationEmployeeFieldProps) {
  const { t } = useTranslation();
  const { field, fieldState } = useController<AllocationFormValues, 'employeeId'>({ name: 'employeeId', control: useFormContext<AllocationFormValues>().control });
  const picker = useCandidatePicker(projectId, field.value);
  const message = fieldState.error?.message;
  if (fixed) {
    const label = [fixed.employee?.fullName, fixed.employee?.code].filter(Boolean).join(' · ');
    return (
      <Field label={t('projects.allocation.col.employee')} required helper={t('projects.allocate.employeeFixed')} className={className}>
        {(control) => <Select {...control} disabled value={field.value} onChange={noChange} options={[{ value: field.value, label }]} placeholder="" />}
      </Field>
    );
  }
  return (
    <Field label={t('projects.allocation.col.employee')} required error={message ? t(message) : undefined} className={className}>
      {(control) => (
        <SearchSelect
          {...control}
          ref={field.ref}
          value={field.value}
          onChange={(id) => {
            picker.remember(id);
            field.onChange(id);
          }}
          options={picker.options}
          search={picker.search}
          onSearch={picker.setSearch}
          onEngage={picker.engage}
          searchLabel={t('projects.allocate.employeeSearch')}
          placeholder={picker.noMatch ? t('projects.form.pmNoMatch') : t('projects.allocate.employeePlaceholder')}
        />
      )}
    </Field>
  );
}
