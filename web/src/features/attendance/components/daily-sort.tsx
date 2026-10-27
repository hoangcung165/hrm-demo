// "Sắp xếp": the most abnormal days first (default) or by name.
import { useTranslation } from 'react-i18next';
import { Select } from '@/components/ui/select';
import type { DailySort } from '../daily-api';

export type DailySortProps = { value: DailySort; onChange: (value: DailySort) => void; className?: string };

export function DailySortSelect({ value, onChange, className }: DailySortProps) {
  const { t } = useTranslation();
  return (
    <Select
      value={value}
      onChange={(next) => onChange(next as DailySort)}
      options={[
        { value: 'abnormal', label: t('attendanceDaily.sort.abnormal') },
        { value: 'name', label: t('attendanceDaily.sort.name') },
      ]}
      placeholder={t('attendanceDaily.sort.label')}
      aria-label={t('attendanceDaily.sort.label')}
      className={className}
    />
  );
}
