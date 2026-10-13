// "PM" of the project form. With "Quản lý mọi dự án": any active Employee, found by name or code. Without it the PM
// is the caller's own Employee (creating) or stays as it is (editing), shown read-only with why.
import { useController, useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Field } from '@/components/ui/field';
import { SearchSelect } from '@/components/ui/search-select';
import { Select } from '@/components/ui/select';
import { useEmployeePicker, type PickedEmployee } from '@/features/employee/use-employee-picker';
import type { ProjectFormValues } from '../schemas';

export type ProjectPmFieldProps = {
  /** PROJECT_EDIT_ALL: any PM may be chosen. */
  free: boolean;
  /** The PM the form starts with, listed before any search. */
  initial: PickedEmployee | null;
  className?: string;
};

const noChange = () => {};

export function ProjectPmField({ free, initial, className }: ProjectPmFieldProps) {
  const { t } = useTranslation();
  const { field, fieldState } = useController<ProjectFormValues, 'pmEmployeeId'>({ name: 'pmEmployeeId', control: useFormContext<ProjectFormValues>().control });
  const picker = useEmployeePicker({ value: field.value, initial });
  const message = fieldState.error?.message;
  if (!free) {
    return (
      <Field label={t('projects.col.pm')} required helper={t('projects.form.pmSelfHelper')} error={message ? t(message) : undefined} className={className}>
        {(control) => <Select {...control} ref={field.ref} disabled value={field.value} onChange={noChange} options={initial ? [{ value: initial.id, label: initial.fullName }] : []} placeholder="" />}
      </Field>
    );
  }
  return (
    <Field label={t('projects.col.pm')} required error={message ? t(message) : undefined} className={className}>
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
          searchLabel={t('projects.form.pmSearch')}
          placeholder={picker.noMatch ? t('projects.form.pmNoMatch') : t('projects.form.pmPlaceholder')}
        />
      )}
    </Field>
  );
}
