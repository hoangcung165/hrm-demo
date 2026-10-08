// "Nhân viên" of the add/edit Account form: the Employee whose Account this is, found by name or code among the
// active Employees, or none (an Account for someone outside the staff, e.g. an outside IT admin).
import { useController, useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Field } from '@/components/ui/field';
import { SearchSelect } from '@/components/ui/search-select';
import { useEmployeePicker } from '@/features/employee/use-employee-picker';
import type { AccountEmployee } from '../api';
import type { AccountValues } from '../schemas';

export type AccountEmployeeFieldProps = {
  /** The Employee the Account is linked to now. */
  current: AccountEmployee | null;
  /** Placeholder values of the server message, e.g. who holds the Employee. */
  errorValues?: Record<string, string>;
  className?: string;
};

export function AccountEmployeeField({ current, errorValues, className }: AccountEmployeeFieldProps) {
  const { t } = useTranslation();
  const { field, fieldState } = useController<AccountValues, 'employeeId'>({ name: 'employeeId', control: useFormContext<AccountValues>().control });
  const picker = useEmployeePicker({
    value: field.value,
    initial: current ? { id: current.employeeId, fullName: current.fullName, code: current.employeeCode, detail: current.orgUnitName } : null,
  });
  const message = fieldState.error?.message;
  return (
    <Field label={t('accounts.form.employee')} helper={t('accounts.form.employeeHelper')} error={message ? t(message, errorValues) : undefined} className={className}>
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
          searchLabel={t('accounts.form.employeeSearch')}
          placeholder={picker.noMatch ? t('accounts.form.employeeNoMatch') : t('accounts.form.employeePlaceholder')}
          noneLabel={t('accounts.form.employeeNone')}
        />
      )}
    </Field>
  );
}
