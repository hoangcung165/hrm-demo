// The days of a Phân ca: the range and, optionally, the weekdays within it. No weekday chosen means every working day of
// the Lịch làm việc; days off and holidays are skipped either way.
import { useTranslation } from 'react-i18next';
import { Checkbox } from '@/components/ui/checkbox';
import { DateRangePicker, type DateRangeValue } from '@/components/ui/date-range-picker';
import { FormGroup } from '@/components/ui/form-group';
import { WEEKDAYS, type Weekday } from '../assign-api';

export type ShiftAssignPeriodProps = {
  range: DateRangeValue;
  onRange: (range: DateRangeValue) => void;
  rangeError: string | null;
  /** The weekdays are for assigning only; clearing takes the whole range. */
  weekdays: Weekday[] | null;
  onWeekdays: (weekdays: Weekday[]) => void;
};

// The `leave.weekday` texts count from Sunday (0), like `Date.getDay()`.
const DAY_INDEX: Record<Weekday, number> = { MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3, THURSDAY: 4, FRIDAY: 5, SATURDAY: 6, SUNDAY: 0 };

export function ShiftAssignPeriod({ range, onRange, rangeError, weekdays, onWeekdays }: ShiftAssignPeriodProps) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-4">
      <DateRangePicker label={t('shiftAssign.period.range')} value={range} onChange={onRange} error={rangeError ? t(rangeError) : undefined} className="w-full md:w-72" />
      {weekdays ? (
        <FormGroup legend={t('shiftAssign.period.weekdays')} className="border-t-0 pt-0" helper={t('shiftAssign.period.weekdaysHelper')}>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {WEEKDAYS.map((weekday) => (
              <Checkbox
                key={weekday}
                checked={weekdays.includes(weekday)}
                aria-label={t(`leave.weekday.long.${DAY_INDEX[weekday]}`)}
                onChange={(event) => onWeekdays(event.target.checked ? [...weekdays, weekday] : weekdays.filter((each) => each !== weekday))}
              >
                {t(`leave.weekday.short.${DAY_INDEX[weekday]}`)}
              </Checkbox>
            ))}
          </div>
        </FormGroup>
      ) : null}
    </div>
  );
}
