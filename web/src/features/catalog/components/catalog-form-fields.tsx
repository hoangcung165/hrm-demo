// Fields of the add/edit catalog item form, inside a FormProvider: code and name, plus what the catalog adds
// (the term of a contract type, the payroll flags of an allowance type, the dates of a holiday).
import { useFormContext, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Checkbox } from '@/components/ui/checkbox';
import { FormField } from '@/components/ui/form-field';
import { Radio } from '@/components/ui/radio';
import type { CatalogKey } from '../api';
import { CODE_MAX, CONTRACT_TERMS, hasCode, MAX_FIXED_TERM_MONTHS, NAME_MAX, type CatalogField, type CatalogValues } from '../schemas';
import { CatalogHolidayDates } from './catalog-holiday-dates';

export type CatalogFormFieldsProps = {
  catalog: CatalogKey;
  /** Placeholder values of server messages, by field. */
  errorValues: Partial<Record<CatalogField, Record<string, string>>>;
};

export function CatalogFormFields({ catalog, errorValues }: CatalogFormFieldsProps) {
  const { t } = useTranslation();
  const { register, setValue, getFieldState, control } = useFormContext<CatalogValues>();
  const term = useWatch({ control, name: 'term' });
  return (
    <>
      {hasCode(catalog) ? (
        <FormField<CatalogValues>
          name="code"
          label={t('catalogs.form.code')}
          helper={t('catalogs.form.codeHelper')}
          errorValues={errorValues.code}
          required
          maxLength={CODE_MAX}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          // Shown in capitals while typing; the value itself is upper-cased when the field is left and again on submit.
          className="[&_input]:uppercase"
          rules={{ onBlur: (event: { target: HTMLInputElement }) => setValue('code', event.target.value.trim().toUpperCase(), { shouldValidate: getFieldState('code').isTouched }) }}
        />
      ) : null}
      <FormField<CatalogValues> name="name" label={t('catalogs.form.name')} errorValues={errorValues.name} required maxLength={NAME_MAX} autoComplete="off" />
      {catalog === 'contract-types' ? (
        <>
          <fieldset className="flex min-w-0 flex-col gap-2">
            <legend className="mb-1 text-[14px] leading-5 font-medium text-ink">
              {t('catalogs.form.term')}
              <span aria-hidden="true" className="text-danger">
                {' '}
                *
              </span>
            </legend>
            {CONTRACT_TERMS.map((value) => (
              <Radio key={value} value={value} className="max-md:min-h-11" {...register('term')}>
                {t(`catalogs.form.termOption.${value}`)}
              </Radio>
            ))}
          </fieldset>
          {term === 'FIXED' ? (
            <FormField<CatalogValues>
              name="maxMonths"
              label={t('catalogs.form.maxMonths')}
              helper={t('catalogs.form.maxMonthsHelper', { max: MAX_FIXED_TERM_MONTHS })}
              required
              inputMode="numeric"
              maxLength={3}
              autoComplete="off"
              className="w-50 [&_input]:text-right [&_input]:tabular-nums"
            />
          ) : null}
        </>
      ) : null}
      {catalog === 'allowance-types' ? (
        <div className="flex flex-col gap-2">
          <Checkbox className="max-md:min-h-11" {...register('insurable')}>
            {t('catalogs.form.insurable')}
          </Checkbox>
          <Checkbox className="max-md:min-h-11" {...register('taxable')}>
            {t('catalogs.form.taxable')}
          </Checkbox>
          <span className="text-caption text-ink-muted">{t('catalogs.form.payrollHelper')}</span>
        </div>
      ) : null}
      {catalog === 'holidays' ? <CatalogHolidayDates errorValues={errorValues} /> : null}
    </>
  );
}
