// "Quản lý trực tiếp" of the employee forms: follow the unit head (the preview names who that is for the chosen
// unit), or choose someone else. On edit the Employee is left out of both, and the manager chosen before is listed.
import { useController, useFormContext, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Field } from '@/components/ui/field';
import { Person } from '@/components/ui/person';
import { Radio } from '@/components/ui/radio';
import type { EmployeeRef } from '../api';
import { useDefaultManager } from '../form-api';
import type { EmployeeFormValues } from '../schemas';
import { EmployeeManagerPicker } from './employee-manager-picker';

export type EmployeeManagerFieldProps = {
  /** On edit: the Employee being edited. */
  employeeId?: string;
  /** On edit: the manager chosen by HR before (`managerSource` ASSIGNED). */
  assigned?: EmployeeRef | null;
};

export function EmployeeManagerField({ employeeId, assigned }: EmployeeManagerFieldProps) {
  const { t } = useTranslation();
  const { control, register } = useFormContext<EmployeeFormValues>();
  const [mode, orgUnitId] = useWatch({ control, name: ['managerMode', 'orgUnitId'] });
  const preview = useDefaultManager(orgUnitId, employeeId);
  const { field, fieldState } = useController<EmployeeFormValues, 'managerId'>({ name: 'managerId', control });
  const manager = preview.data;
  const message = fieldState.error?.message;
  return (
    <fieldset className="flex min-w-0 flex-col gap-2 md:col-span-2">
      <legend className="mb-1 text-[14px] leading-5 font-medium text-ink">{t('employees.col.manager')}</legend>
      <Radio value="UNIT_HEAD" {...register('managerMode')} className="min-h-8 max-md:min-h-11">
        {manager ? (
          <span className="flex flex-wrap items-center gap-2">
            {t('employees.create.followHead')}
            <Person name={manager.fullName} />
          </span>
        ) : (
          t('employees.create.followHeadNobody')
        )}
      </Radio>
      <Radio value="ASSIGNED" {...register('managerMode')} className="min-h-8 max-md:min-h-11">
        {t('employees.create.chooseOther')}
      </Radio>
      {mode === 'ASSIGNED' ? (
        <Field label={t('employees.create.otherManager')} required error={message ? t(message) : undefined} className="pl-6.5">
          {(control) => (
            <EmployeeManagerPicker
              {...control}
              ref={field.ref}
              excludeId={employeeId}
              initial={assigned}
              value={field.value}
              onChange={(id) => {
                field.onChange(id);
                field.onBlur();
              }}
            />
          )}
        </Field>
      ) : null}
      <span className="text-caption text-ink-muted">
        {mode === 'UNIT_HEAD' && preview.isSuccess && !manager ? t('employees.create.noHeadHelper') : t('employees.create.managerHelper')}
      </span>
    </fieldset>
  );
}
