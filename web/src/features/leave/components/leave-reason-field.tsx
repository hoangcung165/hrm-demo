// "Lý do (không bắt buộc)": up to 500 characters, with the count.
import { useTranslation } from 'react-i18next';
import { Field } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import { REASON_MAX } from '../use-leave-form';

export type LeaveReasonFieldProps = { value: string; onChange: (value: string) => void };

export function LeaveReasonField({ value, onChange }: LeaveReasonFieldProps) {
  const { t } = useTranslation();
  return (
    <Field label={t('leave.form.reason')} helper={t('leave.form.reasonCount', { count: value.length, max: REASON_MAX })}>
      {({ invalid, ...control }) => <Textarea {...control} invalid={invalid} value={value} maxLength={REASON_MAX} onChange={(event) => onChange(event.target.value)} />}
    </Field>
  );
}
