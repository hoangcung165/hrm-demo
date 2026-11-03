// The Đơn bổ sung công form: the day as it is now, a time field only for each side that has no time (a punched time is
// never offered), the reason, and who approves (a slot the page fills). What stops a request for the day reads above
// it instead of the fields.
import { useId, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { AdjustmentCheck } from '../adjustment-api';
import { ADJUSTMENT_REASON_MAX, type AdjustmentForm as Form } from '../use-adjustment-form';
import { DailyMarks } from './daily-marks';
import { shiftTimes } from './daily-cells';

export type AdjustmentFormProps = {
  check: AdjustmentCheck;
  form: Form;
  /** Editing a returned request: its own open request does not stop it. */
  editing?: boolean;
  approvers?: ReactNode;
  submitLabel: string;
  onCancel?: () => void;
};

export function AdjustmentForm({ check, form, editing = false, approvers, submitLabel, onCancel }: AdjustmentFormProps) {
  const { t } = useTranslation();
  const formId = useId();
  const problems = check.problems.filter((code) => !(editing && code === 'already_open'));
  const sides = { in: check.inMissing, out: check.outMissing };
  const error = (key?: string) => (key ? t(key) : undefined);
  return (
    <form id={formId} noValidate onSubmit={(event) => { event.preventDefault(); void form.submit(sides); }} className="flex flex-col gap-4">
      <p className="flex flex-wrap items-center gap-2 text-body-small">
        <span>{check.shift ? `${check.shift.name} · ${shiftTimes(check.shift, t)}` : t('attendanceDaily.noShift')}</span>
        {check.day ? <DailyMarks day={check.day} /> : null}
      </p>
      {problems.length > 0 ? (
        <Alert variant="warning" title={t(`attendanceAdjustment.problem.${problems[0]}`)} />
      ) : (
        <>
          {form.problem ? <Alert variant="danger" title={form.problem} /> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            {sides.in ? (
              <Field label={t('attendanceAdjustment.field.in')} error={error(form.errors.in)} helper={t('attendanceAdjustment.field.timeHelp')}>
                {(control) => <Input {...control} inputMode="numeric" placeholder="08:00" value={form.values.in} onChange={(event) => form.set('in', event.target.value)} className="tabular-nums" wrapperClassName="max-md:h-11" />}
              </Field>
            ) : null}
            {sides.out ? (
              <Field label={t('attendanceAdjustment.field.out')} error={error(form.errors.out)} helper={t('attendanceAdjustment.field.timeHelp')}>
                {(control) => <Input {...control} inputMode="numeric" placeholder="17:00" value={form.values.out} onChange={(event) => form.set('out', event.target.value)} className="tabular-nums" wrapperClassName="max-md:h-11" />}
              </Field>
            ) : null}
          </div>
          <Field label={t('attendanceAdjustment.field.reason')} required error={error(form.errors.reason)} helper={t('attendanceAdjustment.field.reasonHelp', { max: ADJUSTMENT_REASON_MAX })}>
            {(control) => <Textarea {...control} rows={3} value={form.values.reason} onChange={(event) => form.set('reason', event.target.value)} />}
          </Field>
          {approvers}
          <div className="flex flex-wrap justify-end gap-2 max-md:flex-col-reverse">
            {onCancel ? (
              <Button variant="secondary" className="max-md:h-11" onClick={onCancel}>
                {t('dialog.cancel')}
              </Button>
            ) : null}
            <Button type="submit" className="max-md:h-11" disabled={form.busy}>
              {submitLabel}
            </Button>
          </div>
        </>
      )}
    </form>
  );
}
