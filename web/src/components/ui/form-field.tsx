// Form field for react-hook-form + zod: label above, helper or error below (caption, danger).
// zod messages are i18n keys; the field translates them, so schemas stay free of UI text.
// Put `noValidate` on the <form>: otherwise the browser's own email/required checks block submit before zod runs.
import { useId, type ReactNode } from 'react';
import { useFormContext, useWatch, type FieldPath, type FieldValues, type RegisterOptions } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Input, type InputProps } from './input';
import { PasswordInput } from './password-input';
import { Textarea } from './textarea';

export type FormFieldProps<T extends FieldValues> = Omit<InputProps, 'name' | 'invalid' | 'id'> & {
  name: FieldPath<T>;
  /** Always visible; no placeholder-only fields. */
  label: string;
  helper?: ReactNode;
  /** Renders a Textarea; with `maxLength` it also shows the character count ("64/500") and tells assistive tech the limit. */
  multiline?: boolean;
  /** Lines of a multiline field (default 3). */
  rows?: number;
  /** Values for the placeholders of the error message, e.g. the unit that already holds a code. */
  errorValues?: Record<string, string>;
  /** react-hook-form `register` options, e.g. an `onBlur` that normalises the value. */
  rules?: RegisterOptions<T, FieldPath<T>>;
  className?: string;
};

export function FormField<T extends FieldValues>({ name, label, helper, required, type, multiline, rows, errorValues, rules, className, ...input }: FormFieldProps<T>) {
  const { t } = useTranslation();
  const { register, getFieldState, formState, control } = useFormContext<T>();
  const id = useId();
  const message = getFieldState(name, formState).error?.message;
  const limit = multiline ? input.maxLength : undefined;
  const noteId = message ? `${id}-error` : helper ? `${id}-helper` : undefined;
  const describedBy = [noteId, limit ? `${id}-limit` : undefined].filter(Boolean).join(' ') || undefined;
  const shared = { id, 'aria-required': required || undefined, 'aria-describedby': describedBy, invalid: Boolean(message) };
  const Control = type === 'password' ? PasswordInput : Input;
  const note = message ? (
    <span id={`${id}-error`} role="alert" className="text-caption text-danger">
      {t(message, errorValues)}
    </span>
  ) : helper ? (
    <span id={`${id}-helper`} className="text-caption text-ink-muted">
      {helper}
    </span>
  ) : null;
  return (
    <div className={cn('flex min-w-0 flex-col gap-1', className)}>
      <label htmlFor={id} className="text-[14px] leading-5 font-medium text-ink">
        {label}
        {required ? (
          <span aria-hidden="true" className="text-danger">
            {' '}
            *
          </span>
        ) : null}
      </label>
      {multiline ? (
        <>
          <Textarea {...shared} rows={rows} maxLength={limit} placeholder={input.placeholder} disabled={input.disabled} {...register(name, rules)} />
          <span className="flex justify-between gap-3">
            {note ?? <span />}
            {limit ? (
              <>
                {/* The running count is visual only; the limit itself is part of the field's description. */}
                <span id={`${id}-limit`} className="sr-only">
                  {t('field.maxLength', { max: formatNumber(limit) })}
                </span>
                <CharacterCount control={control} name={name} max={limit} />
              </>
            ) : null}
          </span>
        </>
      ) : (
        <>
          <Control type={type} {...shared} {...input} {...register(name, rules)} />
          {note}
        </>
      )}
    </div>
  );
}

type CharacterCountProps<T extends FieldValues> = { control: ReturnType<typeof useFormContext<T>>['control']; name: FieldPath<T>; max: number };

function CharacterCount<T extends FieldValues>({ control, name, max }: CharacterCountProps<T>) {
  const value: unknown = useWatch({ control, name });
  const length = typeof value === 'string' ? value.length : 0;
  return (
    <span aria-hidden="true" className="shrink-0 text-caption text-ink-muted tabular-nums">
      {formatNumber(length)}/{formatNumber(max)}
    </span>
  );
}
