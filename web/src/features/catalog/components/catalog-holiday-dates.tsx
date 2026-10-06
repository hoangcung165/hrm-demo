// "Từ ngày" and "Đến ngày" of a holiday, side by side, with one error line under both: a missing date marks its own
// field, a wrong range (backwards, too long, overlapping another holiday) marks both.
import { useId } from 'react';
import { useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { formatNumber } from '@/lib/format';
import { MAX_HOLIDAY_DAYS, type CatalogField, type CatalogValues } from '../schemas';

export type CatalogHolidayDatesProps = {
  /** Placeholder values of server messages, by field. */
  errorValues: Partial<Record<CatalogField, Record<string, string>>>;
};

export function CatalogHolidayDates({ errorValues }: CatalogHolidayDatesProps) {
  const { t } = useTranslation();
  const { register, formState } = useFormContext<CatalogValues>();
  const id = useId();
  const startError = formState.errors.startDate?.message;
  const endError = formState.errors.endDate?.message;
  // Errors on `endDate` other than "required" are about the range as a whole.
  const rangeError = Boolean(endError) && endError !== 'catalogs.validation.endDateRequired';
  const message = startError ?? endError;
  const values = startError ? errorValues.startDate : errorValues.endDate;
  const noteId = message ? `${id}-error` : `${id}-helper`;
  const field = (name: 'startDate' | 'endDate', invalid: boolean) => (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={`${id}-${name}`} className="text-[14px] leading-5 font-medium text-ink">
        {t(`catalogs.form.${name}`)}
        <span aria-hidden="true" className="text-danger">
          {' '}
          *
        </span>
      </label>
      <Input
        id={`${id}-${name}`}
        type="date"
        invalid={invalid}
        aria-required
        aria-describedby={noteId}
        className="tabular-nums"
        // A new start date checks the range again, and clears an overlap the server reported.
        {...register(name, name === 'startDate' ? { deps: ['endDate'] } : undefined)}
      />
    </div>
  );
  return (
    <div className="flex flex-col gap-1">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {field('startDate', Boolean(startError) || rangeError)}
        {field('endDate', Boolean(endError))}
      </div>
      {message ? (
        <span id={`${id}-error`} role="alert" className="text-caption text-danger">
          {t(message, values)}
        </span>
      ) : (
        <span id={`${id}-helper`} className="text-caption text-ink-muted">
          {t('catalogs.form.datesHelper', { max: formatNumber(MAX_HOLIDAY_DAYS) })}
        </span>
      )}
    </div>
  );
}
