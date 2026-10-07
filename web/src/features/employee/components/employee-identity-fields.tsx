// The fields of "Giấy tờ định danh": CCCD, its issue date and place, MST and số BHXH. "Dùng số CCCD làm mã số thuế"
// hides the MST field and sends the CCCD as the MST. Shared by "Thêm nhân viên" (where the numbers may be typed
// without EMPLOYEE_SENSITIVE_VIEW) and the card edited in place (full values only).
import { useFormContext, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Checkbox } from '@/components/ui/checkbox';
import { FormField } from '@/components/ui/form-field';
import { FormGrid } from '@/components/ui/form-grid';
import { format } from 'date-fns';
import { ISSUE_PLACE_MAX, type EmployeeFormField, type EmployeeFormValues } from '../schemas';

export type EmployeeIdentityFieldsProps = { errorValues: Partial<Record<EmployeeFormField, Record<string, string>>> };

export function EmployeeIdentityFields({ errorValues }: EmployeeIdentityFieldsProps) {
  const { t } = useTranslation();
  const { control, register } = useFormContext<EmployeeFormValues>();
  const fromId = useWatch({ control, name: 'taxCodeFromId' });
  const number = { inputMode: 'numeric' as const, autoComplete: 'off', spellCheck: false, maxLength: 20 };
  return (
    <FormGrid>
      <FormField<EmployeeFormValues>
        name="idNumber"
        label={t('employees.profile.identity.idNumber')}
        required
        helper={t('employees.create.idNumberHelper')}
        errorValues={errorValues.idNumber}
        {...number}
      />
      <FormField<EmployeeFormValues> name="idIssueDate" type="date" label={t('employees.profile.identity.idIssueDate')} max={format(new Date(), 'yyyy-MM-dd')} />
      <FormField<EmployeeFormValues> name="idIssuePlace" label={t('employees.profile.identity.idIssuePlace')} maxLength={ISSUE_PLACE_MAX} autoComplete="off" className="md:col-span-2" />
      <div className="flex flex-col gap-1 md:col-span-2">
        <Checkbox {...register('taxCodeFromId')} className="min-h-10 max-md:min-h-11">
          {t('employees.create.taxCodeFromId')}
        </Checkbox>
        <span className="text-caption text-ink-muted">{t('employees.create.taxCodeFromIdHelper')}</span>
      </div>
      {fromId ? null : (
        <FormField<EmployeeFormValues>
          name="taxCode"
          label={t('employees.profile.identity.taxCode')}
          helper={t('employees.create.numberHelper')}
          errorValues={errorValues.taxCode}
          {...number}
        />
      )}
      <FormField<EmployeeFormValues>
        name="socialInsuranceNumber"
        label={t('employees.profile.identity.socialInsuranceNumber')}
        helper={t('employees.create.numberHelper')}
        errorValues={errorValues.socialInsuranceNumber}
        {...number}
      />
    </FormGrid>
  );
}
