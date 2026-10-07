// "Quản lý trực tiếp" of the create form: follow the unit head (the default; the preview names who that is for the
// chosen unit), or choose someone else.
import { useController, useFormContext, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Field } from '@/components/ui/field';
import { Person } from '@/components/ui/person';
import { Radio } from '@/components/ui/radio';
import { useDefaultManager } from '../api';
import type { EmployeeCreateValues } from '../schemas';
import { EmployeeManagerPicker } from './employee-manager-picker';

export function EmployeeManagerField() {
  const { t } = useTranslation();
  const { control, register } = useFormContext<EmployeeCreateValues>();
  const [mode, orgUnitId] = useWatch({ control, name: ['managerMode', 'orgUnitId'] });
  const preview = useDefaultManager(orgUnitId);
  const { field, fieldState } = useController<EmployeeCreateValues, 'managerId'>({ name: 'managerId', control });
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
