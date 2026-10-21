// Fields of the add/edit shift form, inside a FormProvider: code and name, the times, the tolerances and the rounding,
// then a live preview of the hours.
import { useFormContext, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { FormField } from '@/components/ui/form-field';
import { FormSelect } from '@/components/ui/form-select';
import { ROUNDING_MODES, ROUNDING_STEPS } from '../api';
import { normalizeTime } from '../duration';
import { CODE_MAX, NAME_MAX, TOLERANCE_MAX, type ShiftValues } from '../schemas';
import { ShiftPreview } from './shift-preview';

export type ShiftFormFieldsProps = {
  /** Edit: the code is shown and cannot change. */
  codeLocked: boolean;
};

export function ShiftFormFields({ codeLocked }: ShiftFormFieldsProps) {
  const { t } = useTranslation();
  const { setValue, getFieldState, control } = useFormContext<ShiftValues>();
  const mode = useWatch({ control, name: 'roundingMode' });
  // A time is written the way it is typed, then tidied ("6:00" → "06:00") when the field is left.
  const time = (name: 'startTime' | 'endTime' | 'breakStart' | 'breakEnd', label: string, extra: { required?: boolean; helper?: string } = {}) => (
    <FormField<ShiftValues>
      name={name}
      label={label}
      {...extra}
      inputMode="numeric"
      maxLength={5}
      placeholder="HH:mm"
      autoComplete="off"
      className="[&_input]:tabular-nums"
      rules={{ onBlur: (event: { target: HTMLInputElement }) => setValue(name, normalizeTime(event.target.value), { shouldValidate: getFieldState(name).isTouched }) }}
    />
  );
  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[10rem_minmax(0,1fr)]">
        <FormField<ShiftValues>
          name="code"
          label={t('shifts.form.code')}
          helper={codeLocked ? t('shifts.form.codeLocked') : t('shifts.form.codeHelper')}
          required
          maxLength={CODE_MAX}
          readOnly={codeLocked}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          className="[&_input]:uppercase"
          rules={{ onBlur: (event: { target: HTMLInputElement }) => setValue('code', event.target.value.trim().toUpperCase(), { shouldValidate: getFieldState('code').isTouched }) }}
        />
        <FormField<ShiftValues> name="name" label={t('shifts.form.name')} required maxLength={NAME_MAX} autoComplete="off" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        {time('startTime', t('shifts.form.startTime'), { required: true })}
        {time('endTime', t('shifts.form.endTime'), { required: true, helper: t('shifts.form.endHelper') })}
      </div>
      <div className="grid grid-cols-2 gap-4">
        {time('breakStart', t('shifts.form.breakStart'), { helper: t('shifts.form.breakHelper') })}
        {time('breakEnd', t('shifts.form.breakEnd'))}
      </div>
      <ShiftPreview />
      <div className="grid grid-cols-2 gap-4">
        <FormField<ShiftValues>
          name="lateToleranceMinutes"
          label={t('shifts.form.lateTolerance')}
          helper={t('shifts.form.toleranceHelper', { max: TOLERANCE_MAX })}
          inputMode="numeric"
          maxLength={3}
          autoComplete="off"
          className="[&_input]:text-right [&_input]:tabular-nums"
        />
        <FormField<ShiftValues>
          name="earlyToleranceMinutes"
          label={t('shifts.form.earlyTolerance')}
          helper={t('shifts.form.toleranceHelper', { max: TOLERANCE_MAX })}
          inputMode="numeric"
          maxLength={3}
          autoComplete="off"
          className="[&_input]:text-right [&_input]:tabular-nums"
        />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormSelect<ShiftValues>
          name="roundingMode"
          label={t('shifts.form.roundingMode')}
          placeholder={t('shifts.form.roundingMode')}
          options={ROUNDING_MODES.map((value) => ({ value, label: t(`shifts.rounding.mode.${value}`) }))}
        />
        {mode === 'NONE' ? null : (
          <FormSelect<ShiftValues>
            name="roundingMinutes"
            label={t('shifts.form.roundingStep')}
            placeholder={t('shifts.form.roundingStep')}
            options={ROUNDING_STEPS.map((step) => ({ value: String(step), label: t('shifts.form.roundingStepOption', { minutes: step }) }))}
          />
        )}
      </div>
    </>
  );
}
