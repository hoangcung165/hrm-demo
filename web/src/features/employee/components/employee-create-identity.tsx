// Group "Giấy tờ định danh" of the create form. The numbers may be typed without EMPLOYEE_SENSITIVE_VIEW (the
// backend takes them, and shows them masked afterwards). "Dùng số CCCD làm mã số thuế", on by default, hides the
// MST field and sends the CCCD as the MST.
import { useFormContext, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Checkbox } from '@/components/ui/checkbox';
import { FormField } from '@/components/ui/form-field';
import { FormGrid } from '@/components/ui/form-grid';
import { FormGroup } from '@/components/ui/form-group';
import { format } from 'date-fns';
import { ISSUE_PLACE_MAX, type EmployeeCreateField, type EmployeeCreateValues } from '../schemas';

export type EmployeeCreateIdentityProps = { errorValues: Partial<Record<EmployeeCreateField, Record<string, string>>> };

export function EmployeeCreateIdentity({ errorValues }: EmployeeCreateIdentityProps) {
  const { t } = useTranslation();
  const { control, register } = useFormContext<EmployeeCreateValues>();
  const fromId = useWatch({ control, name: 'taxCodeFromId' });
  const number = { inputMode: 'numeric' as const, autoComplete: 'off', spellCheck: false, maxLength: 20 };
  return (
    <FormGroup legend={t('employees.profile.identity.title')}>
      <FormGrid>
        <FormField<EmployeeCreateValues>
          name="idNumber"
          label={t('employees.profile.identity.idNumber')}
          required
          helper={t('employees.create.idNumberHelper')}
          errorValues={errorValues.idNumber}
          {...number}
        />
        <FormField<EmployeeCreateValues> name="idIssueDate" type="date" label={t('employees.profile.identity.idIssueDate')} max={format(new Date(), 'yyyy-MM-dd')} />
        <FormField<EmployeeCreateValues> name="idIssuePlace" label={t('employees.profile.identity.idIssuePlace')} maxLength={ISSUE_PLACE_MAX} autoComplete="off" className="md:col-span-2" />
        <div className="flex flex-col gap-1 md:col-span-2">
          <Checkbox {...register('taxCodeFromId')} className="min-h-10 max-md:min-h-11">
            {t('employees.create.taxCodeFromId')}
          </Checkbox>
          <span className="text-caption text-ink-muted">{t('employees.create.taxCodeFromIdHelper')}</span>
        </div>
        {fromId ? null : (
          <FormField<EmployeeCreateValues>
            name="taxCode"
            label={t('employees.profile.identity.taxCode')}
            helper={t('employees.create.numberHelper')}
            errorValues={errorValues.taxCode}
            {...number}
          />
        )}
        <FormField<EmployeeCreateValues>
          name="socialInsuranceNumber"
          label={t('employees.profile.identity.socialInsuranceNumber')}
          helper={t('employees.create.numberHelper')}
          errorValues={errorValues.socialInsuranceNumber}
          {...number}
        />
      </FormGrid>
    </FormGroup>
  );
}
