// Select as a react-hook-form field: Field shell + Select, with the zod message (an i18n key) translated here.
// Validated on change and on submit, not on blur: opening the menu moves focus off the control.
import { useController, useFormContext, type FieldPath, type FieldValues } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Field, type FieldProps } from './field';
import { Select, type SelectProps } from './select';

export type FormSelectProps<T extends FieldValues> = Pick<FieldProps, 'label' | 'required' | 'helper' | 'className'> &
  Pick<SelectProps, 'options' | 'placeholder' | 'disabled'> & { name: FieldPath<T> };

export function FormSelect<T extends FieldValues>({ name, label, required, helper, className, ...select }: FormSelectProps<T>) {
  const { t } = useTranslation();
  const { field, fieldState } = useController<T>({ name, control: useFormContext<T>().control });
  const message = fieldState.error?.message;
  return (
    <Field label={label} required={required} helper={helper} error={message ? t(message) : undefined} className={className}>
      {(control) => <Select {...control} {...select} ref={field.ref} value={field.value ?? ''} onChange={field.onChange} />}
    </Field>
  );
}
