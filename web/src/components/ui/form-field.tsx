// Form field for react-hook-form + zod: label above, helper or error below (caption, danger).
// zod messages are i18n keys; the field translates them, so schemas stay free of UI text.
// Put `noValidate` on the <form>: otherwise the browser's own email/required checks block submit before zod runs.
import { useId, type ReactNode } from 'react';
import { useFormContext, type FieldPath, type FieldValues } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Input, type InputProps } from './input';
import { PasswordInput } from './password-input';

export type FormFieldProps<T extends FieldValues> = Omit<InputProps, 'name' | 'invalid' | 'id'> & {
  name: FieldPath<T>;
  /** Always visible; no placeholder-only fields. */
  label: string;
  helper?: ReactNode;
  className?: string;
};

export function FormField<T extends FieldValues>({ name, label, helper, required, type, className, ...input }: FormFieldProps<T>) {
  const { t } = useTranslation();
  const { register, getFieldState, formState } = useFormContext<T>();
  const id = useId();
  const message = getFieldState(name, formState).error?.message;
  const describedBy = message ? `${id}-error` : helper ? `${id}-helper` : undefined;
  const Control = type === 'password' ? PasswordInput : Input;
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <label htmlFor={id} className="text-[14px] leading-5 font-medium text-ink">
        {label}
        {required ? (
          <span aria-hidden="true" className="text-danger">
            {' '}
            *
          </span>
        ) : null}
      </label>
      <Control
        id={id}
        type={type}
        invalid={Boolean(message)}
        aria-required={required || undefined}
        aria-describedby={describedBy}
        {...input}
        {...register(name)}
      />
      {message ? (
        <span id={`${id}-error`} role="alert" className="text-caption text-danger">
          {t(message)}
        </span>
      ) : helper ? (
        <span id={`${id}-helper`} className="text-caption text-ink-muted">
          {helper}
        </span>
      ) : null}
    </div>
  );
}
