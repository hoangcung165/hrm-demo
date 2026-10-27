// "Lọc" at 390: unit, search and sort in a dialog; they apply when "Áp dụng" is pressed.
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import type { DailySort } from '../daily-api';
import type { DailyFilters } from '../use-daily-filters';
import { DailySortSelect } from './daily-sort';
import { DailyUnitFilter } from './daily-unit-filter';

export type DailyFilterDialogProps = { open: boolean; onOpenChange: (open: boolean) => void; filters: DailyFilters };

export function DailyFilterDialog({ open, onOpenChange, filters }: DailyFilterDialogProps) {
  const { t } = useTranslation();
  const { query } = filters;
  const [unit, setUnit] = useState(query.orgUnitId);
  const [text, setText] = useState(query.q);
  const [sort, setSort] = useState<DailySort>(query.sort);
  // Each opening starts from what the URL holds.
  const change = (next: boolean) => {
    if (next) {
      setUnit(query.orgUnitId);
      setText(query.q);
      setSort(query.sort);
    }
    onOpenChange(next);
  };
  const apply = () => {
    filters.setFilters({ unit, q: text, sort });
    onOpenChange(false);
  };
  return (
    <Dialog
      open={open}
      onOpenChange={change}
      title={t('attendanceDaily.filter.title')}
      footer={
        <>
          <Button variant="secondary" onClick={() => { setUnit(''); setText(''); }}>
            {t('attendanceDaily.filter.clear')}
          </Button>
          <Button onClick={apply}>{t('attendanceDaily.filter.apply')}</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-[14px] leading-5 font-medium text-ink">{t('attendanceDaily.filter.unit')}</span>
          <DailyUnitFilter value={unit} onChange={setUnit} />
        </div>
        <Field label={t('attendanceDaily.filter.search')}>
          {(control) => <Input {...control} value={text} onChange={(event) => setText(event.target.value)} placeholder={t('attendanceDaily.filter.searchPlaceholder')} />}
        </Field>
        <div className="flex flex-col gap-1">
          <span className="text-[14px] leading-5 font-medium text-ink">{t('attendanceDaily.sort.label')}</span>
          <DailySortSelect value={sort} onChange={setSort} />
        </div>
      </div>
    </Dialog>
  );
}
