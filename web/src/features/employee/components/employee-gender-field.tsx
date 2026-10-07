// "Giới tính" of the create form: Nam / Nữ as on the CCCD, required.
import { useId } from 'react';
import { useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Radio } from '@/components/ui/radio';
import type { EmployeeCreateValues } from '../schemas';

export function EmployeeGenderField() {
  const { t } = useTranslation();
  const id = useId();
  const { register, getFieldState, formState } = useFormContext<EmployeeCreateValues>();
  const message = getFieldState('gender', formState).error?.message;
  return (
    <fieldset className="flex min-w-0 flex-col gap-1" aria-describedby={message ? `${id}-error` : undefined} aria-invalid={message ? true : undefined}>
      <legend className="mb-1 text-[14px] leading-5 font-medium text-ink">
        {t('employees.profile.personal.gender')}
        <span aria-hidden="true" className="text-danger">
          {' '}
          *
        </span>
      </legend>
      <div className="flex h-10 items-center gap-6 max-md:h-11">
        <Radio value="MALE" {...register('gender')}>
          {t('employees.profile.gender.MALE')}
        </Radio>
        <Radio value="FEMALE" {...register('gender')}>
          {t('employees.profile.gender.FEMALE')}
        </Radio>
      </div>
      {message ? (
        <span id={`${id}-error`} role="alert" className="text-caption text-danger">
          {t(message)}
        </span>
      ) : null}
    </fieldset>
  );
}
