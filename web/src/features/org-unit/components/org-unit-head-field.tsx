// "Trưởng đơn vị" of the add/edit unit form: any active Employee of the company, found by name or code, or nobody.
// The current head is listed before any search.
import { useController, useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Field } from '@/components/ui/field';
import { SearchSelect } from '@/components/ui/search-select';
import { useEmployeePicker } from '@/features/employee/use-employee-picker';
import type { OrgUnitHead } from '../api';
import type { OrgUnitValues } from '../schemas';

export type OrgUnitHeadFieldProps = { current: OrgUnitHead | null; className?: string };

export function OrgUnitHeadField({ current, className }: OrgUnitHeadFieldProps) {
  const { t } = useTranslation();
  const { field, fieldState } = useController<OrgUnitValues, 'headEmployeeId'>({ name: 'headEmployeeId', control: useFormContext<OrgUnitValues>().control });
  const picker = useEmployeePicker({
    value: field.value,
    initial: current?.employeeId ? { id: current.employeeId, fullName: current.fullName, code: current.employeeCode, detail: current.position } : null,
  });
  const message = fieldState.error?.message;
  return (
    <Field label={t('org.form.head')} helper={t('org.form.headHelper')} error={message ? t(message) : undefined} className={className}>
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
          searchLabel={t('org.form.headSearch')}
          placeholder={picker.noMatch ? t('org.form.headNoMatch') : t('org.form.headPlaceholder')}
          noneLabel={t('org.form.headNone')}
        />
      )}
    </Field>
  );
}
