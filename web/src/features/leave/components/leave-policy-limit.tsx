// "Định mức và cách cấp" and "Phép tồn cuối năm": only for a type with a limit (trừ số dư). The yearly entitlement,
// the seniority step, monthly accrual or the whole year at once, the cut-off day for mid-month hires, advance, and how
// much carries over to next year until when.
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Checkbox } from '@/components/ui/checkbox';
import { FormField } from '@/components/ui/form-field';
import { FormGrid } from '@/components/ui/form-grid';
import { FormGroup } from '@/components/ui/form-group';
import { Radio } from '@/components/ui/radio';
import { Switch } from '@/components/ui/switch';
import type { PolicyFormValues } from '../policy-schema';

export function LeavePolicyLimit() {
  const { t } = useTranslation();
  const { register, control } = useFormContext<PolicyFormValues>();
  const limited = useWatch({ control, name: 'limited' });
  const days = <span className="text-body-small text-ink-muted">{t('leave.policy.unitDays')}</span>;
  return (
    <FormGroup legend={t('leave.policy.limitTitle')}>
      <div className="flex flex-col gap-4">
        <Controller
          control={control}
          name="limited"
          render={({ field }) => <Switch checked={field.value} onChange={field.onChange} label={t('leave.policy.limited')} caption={t(field.value ? 'leave.policy.limitedOn' : 'leave.policy.limitedOff')} />}
        />
        {limited ? (
          <>
            <FormGrid>
              <FormField<PolicyFormValues> name="entitlementDays" label={t('leave.policy.entitlement')} required inputMode="decimal" trailing={days} />
              <FormField<PolicyFormValues> name="seniorityStepYears" label={t('leave.policy.step')} helper={t('leave.policy.stepHelper')} inputMode="numeric" trailing={<span className="text-body-small text-ink-muted">{t('leave.policy.unitYears')}</span>} />
            </FormGrid>
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-[14px] leading-5 font-medium">{t('leave.policy.accrual')}</legend>
              <Radio value="MONTHLY" className="max-md:min-h-11" {...register('accrual')}>
                {t('leave.policy.accrualOption.MONTHLY')}
              </Radio>
              <Radio value="YEARLY" className="max-md:min-h-11" {...register('accrual')}>
                {t('leave.policy.accrualOption.YEARLY')}
              </Radio>
            </fieldset>
            <FormField<PolicyFormValues> name="cutOffDay" label={t('leave.policy.cutOff')} helper={t('leave.policy.cutOffHelper')} inputMode="numeric" className="md:max-w-60" />
            <Checkbox className="max-md:min-h-11" aria-describedby="leave-policy-advance" {...register('advanceAllowed')}>
              <span className="flex flex-col">
                {t('leave.policy.advance')}
                <span id="leave-policy-advance" className="text-caption text-ink-muted">
                  {t('leave.policy.advanceHelper')}
                </span>
              </span>
            </Checkbox>
            <FormGrid className="border-t border-line pt-4">
              <FormField<PolicyFormValues> name="carryOverMaxDays" label={t('leave.policy.carryOver')} helper={t('leave.policy.carryOverHelper')} inputMode="decimal" trailing={days} />
              <FormField<PolicyFormValues> name="carryOverExpiry" label={t('leave.policy.expiry')} helper={t('leave.policy.expiryHelper')} placeholder="31/03" inputMode="numeric" />
            </FormGrid>
          </>
        ) : null}
      </div>
    </FormGroup>
  );
}
