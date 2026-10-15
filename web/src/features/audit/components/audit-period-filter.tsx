// Filter "Khoảng thời gian": company days, both ends included. Picking the first day already narrows the list from
// that day on; "Xóa bộ lọc" takes the period away.
import { parseISO } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { toIsoDate } from '@/lib/format';
import type { AuditFilters } from '../use-audit-filters';

export type AuditPeriodFilterProps = { filters: AuditFilters; labelHidden?: boolean; className?: string };

export function AuditPeriodFilter({ filters, labelHidden = false, className }: AuditPeriodFilterProps) {
  const { t } = useTranslation();
  const { from, to } = filters.query;
  return (
    <DateRangePicker
      label={t('audit.filter.period')}
      labelHidden={labelHidden}
      value={{ from: from ? parseISO(from) : undefined, to: to ? parseISO(to) : undefined }}
      onChange={(range) => filters.setPeriod(range.from ? toIsoDate(range.from) : '', range.to ? toIsoDate(range.to) : '')}
      className={className}
    />
  );
}
