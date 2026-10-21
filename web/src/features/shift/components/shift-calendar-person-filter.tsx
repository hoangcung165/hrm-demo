// Filter "Nhân viên": a search over the active Employees and a Select of the matches; the grid then shows that one person.
import { useTranslation } from 'react-i18next';
import { SearchSelect } from '@/components/ui/search-select';
import { useEmployeePicker, type PickedEmployee } from '@/features/employee/use-employee-picker';

export type ShiftCalendarPersonFilterProps = {
  value: string;
  onChange: (id: string) => void;
  /** The chosen person when the page was opened from a link, so the Select can name them. */
  initial?: PickedEmployee | null;
  className?: string;
};

export function ShiftCalendarPersonFilter({ value, onChange, initial, className }: ShiftCalendarPersonFilterProps) {
  const { t } = useTranslation();
  const picker = useEmployeePicker({ value, initial });
  return (
    <SearchSelect
      value={value}
      onChange={(next) => {
        picker.remember(next);
        onChange(next);
      }}
      options={picker.options}
      search={picker.search}
      onSearch={picker.setSearch}
      onEngage={picker.engage}
      searchLabel={t('shiftCalendar.filter.findPerson')}
      placeholder={picker.noMatch ? t('shiftCalendar.filter.noPerson') : t('shiftCalendar.filter.person')}
      noneLabel={t('shiftCalendar.filter.allPeople')}
      className={className}
    />
  );
}
