// "Thông tin chung" of a type: name, code (set once), who pays, half days, a required file, the most days per request.
import { useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Checkbox } from '@/components/ui/checkbox';
import { FormField } from '@/components/ui/form-field';
import { FormGrid } from '@/components/ui/form-grid';
import { FormGroup } from '@/components/ui/form-group';
import { Radio } from '@/components/ui/radio';
import { NAME_MAX, type PolicyFormValues } from '../policy-schema';

const PAYS = ['COMPANY', 'SOCIAL_INSURANCE', 'UNPAID'] as const;

export type LeavePolicyGeneralProps = { creating: boolean };

export function LeavePolicyGeneral({ creating }: LeavePolicyGeneralProps) {
  const { t } = useTranslation();
  const { register } = useFormContext<PolicyFormValues>();
  const unit = <span className="text-body-small text-ink-muted">{t('leave.policy.unitDays')}</span>;
  return (
    <div className="flex flex-col gap-4">
      <FormGrid>
        <FormField<PolicyFormValues> name="name" label={t('leave.policy.name')} required maxLength={NAME_MAX} autoComplete="off" />
        <FormField<PolicyFormValues>
          name="code"
          label={t('leave.policy.code')}
          required={creating}
          readOnly={!creating}
          helper={creating ? t('leave.policy.codeHelper') : t('leave.policy.codeFixed')}
          maxLength={20}
          autoComplete="off"
          spellCheck={false}
          wrapperClassName={creating ? undefined : 'bg-surface-muted text-ink-muted'}
        />
      </FormGrid>
      <FormGroup legend={t('leave.policy.pay')} helper={t('leave.policy.payHelper')}>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {PAYS.map((pay) => (
            <Radio key={pay} value={pay} className="max-md:min-h-11" {...register('pay')}>
              {t(`leave.policy.payOption.${pay}`)}
            </Radio>
          ))}
        </div>
      </FormGroup>
      <div className="flex flex-col gap-2">
        <Checkbox className="max-md:min-h-11" {...register('halfDayAllowed')}>
          {t('leave.policy.halfDay')}
        </Checkbox>
        <Checkbox className="max-md:min-h-11" {...register('attachmentRequired')}>
          {t('leave.policy.attachment')}
        </Checkbox>
      </div>
      <FormField<PolicyFormValues> name="maxDaysPerRequest" label={t('leave.policy.maxPerRequest')} helper={t('leave.policy.maxPerRequestHelper')} inputMode="decimal" trailing={unit} className="md:max-w-60" />
    </div>
  );
}
