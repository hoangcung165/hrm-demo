// "Áp dụng từ": the policy is saved as a version from this date (requests already approved keep their days); the
// versions the type has, the one in force marked.
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { FormField } from '@/components/ui/form-field';
import { FormGroup } from '@/components/ui/form-group';
import { companyTodayIso } from '@/lib/company-time';
import { formatDate } from '@/lib/format';
import type { LeavePolicyValues } from '../policy-api';
import type { PolicyFormValues } from '../policy-schema';

export type LeavePolicyApplyProps = { versions: LeavePolicyValues[]; inForce: string | null };

export function LeavePolicyApply({ versions, inForce }: LeavePolicyApplyProps) {
  const { t } = useTranslation();
  const today = companyTodayIso();
  return (
    <FormGroup legend={t('leave.policy.applyTitle')}>
      <div className="flex flex-col gap-3">
        <FormField<PolicyFormValues> name="effectiveFrom" type="date" label={t('leave.policy.from')} required helper={t('leave.policy.fromHelper')} className="md:max-w-60" />
        {versions.length ? (
          <div className="flex flex-col gap-1">
            <span className="text-caption text-ink-muted">{t('leave.policy.versions')}</span>
            <ul className="flex flex-wrap gap-2">
              {versions.map((version) => (
                <li key={version.effectiveFrom}>
                  <Badge variant={version.effectiveFrom === inForce ? 'success' : version.effectiveFrom > today ? 'info' : 'neutral'}>
                    {t(version.effectiveFrom === inForce ? 'leave.policy.versionInForce' : version.effectiveFrom > today ? 'leave.policy.versionNext' : 'leave.policy.versionPast', {
                      date: version.effectiveFrom <= '2000-01-01' ? t('leave.policy.fromStart') : formatDate(version.effectiveFrom),
                    })}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </FormGroup>
  );
}
