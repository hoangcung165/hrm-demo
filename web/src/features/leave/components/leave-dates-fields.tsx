// "Từ ngày" and "Đến ngày", each with its day part: the first day may start in the afternoon, the last end in the
// morning; one day is whole, morning or afternoon. Over the balance or overlapping, the dates show in error.
import { useTranslation } from 'react-i18next';
import { DatePartField } from '@/components/ui/date-part-field';
import type { DayPart } from '../api';
import type { LeaveForm } from '../use-leave-form';

export type LeaveDatesFieldsProps = {
  form: LeaveForm;
  startError?: string;
  endError?: string;
  /** The dates are the cause of a problem shown below them (no text of their own). */
  invalid?: boolean;
};

export function LeaveDatesFields({ form, startError, endError, invalid = false }: LeaveDatesFieldsProps) {
  const { t } = useTranslation();
  const options = (parts: DayPart[]) => parts.map((part) => ({ value: part, label: t(`leave.partLabel.${part}`) }));
  const { values } = form;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <DatePartField
        label={t('leave.form.start')}
        required
        date={values.startDate}
        onDateChange={form.setStartDate}
        part={values.startPart}
        onPartChange={(part) => form.setStartPart(part as DayPart)}
        partOptions={options(form.startOptions)}
        partLabel={t('leave.form.startPart')}
        error={startError}
        invalid={invalid}
      />
      <DatePartField
        label={t('leave.form.end')}
        required
        date={values.endDate}
        min={values.startDate || undefined}
        onDateChange={form.setEndDate}
        part={values.endPart}
        onPartChange={(part) => form.setEndPart(part as DayPart)}
        partOptions={options(form.endOptions)}
        partLabel={t('leave.form.endPart')}
        error={endError}
        invalid={invalid}
      />
    </div>
  );
}
