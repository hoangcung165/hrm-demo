// Filter "Ca": only the people who work the chosen shift in the range. Offers every shift, turned off or not, because
// days already assigned keep the shift they had.
import { useTranslation } from 'react-i18next';
import { Select } from '@/components/ui/select';
import { useShifts } from '../api';

export type ShiftCalendarShiftFilterProps = { value: string; onChange: (id: string) => void; className?: string };

// The Select has no empty value: this one stands for "every shift".
const ALL = 'ALL';

export function ShiftCalendarShiftFilter({ value, onChange, className }: ShiftCalendarShiftFilterProps) {
  const { t } = useTranslation();
  const shifts = useShifts();
  const options = [
    { value: ALL, label: t('shiftCalendar.filter.allShifts') },
    ...(shifts.data ?? []).map((shift) => ({ value: shift.id, label: `${shift.code} · ${shift.name}${shift.active ? '' : ` (${t('shifts.status.INACTIVE')})`}` })),
  ];
  return (
    <Select
      aria-label={t('shiftCalendar.filter.shift')}
      value={value || ALL}
      onChange={(next) => onChange(next === ALL ? '' : next)}
      options={options}
      placeholder={t('shiftCalendar.filter.shift')}
      className={className}
    />
  );
}
