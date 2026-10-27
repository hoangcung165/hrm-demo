// What stands in for the list when no person matches: no log at all yet, a search without a match, no abnormal day, or
// simply nobody in the unit.
import { CalendarCheck, FileUp, SearchX, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Button, buttonVariants } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { formatDateRange } from '@/lib/format';
import type { DailyAttendance } from '../daily-api';
import type { DailyFilters } from '../use-daily-filters';

export type DailyEmptyProps = { data: DailyAttendance; filters: DailyFilters; canImport: boolean };

export function DailyEmpty({ data, filters, canImport }: DailyEmptyProps) {
  const { t } = useTranslation();
  const { query } = filters;
  if (query.q) {
    return (
      <EmptyState
        icon={<SearchX />}
        title={t('attendanceDaily.empty.noMatch', { q: query.q })}
        description={t('attendanceDaily.empty.noMatchText', { unit: query.orgUnitId ? t('attendanceDaily.empty.thisUnit') : t('attendanceDaily.empty.company') })}
        actions={<Button variant="secondary" onClick={() => filters.setSearch('')}>{t('attendanceDaily.empty.clearSearch')}</Button>}
      />
    );
  }
  if (query.abnormalOnly) {
    return (
      <EmptyState
        icon={<CalendarCheck />}
        title={t('attendanceDaily.empty.noAbnormal', { range: formatDateRange(data.from, data.to) })}
        description={t('attendanceDaily.empty.noAbnormalText')}
        actions={<Button variant="secondary" onClick={() => filters.setAbnormal(false)}>{t('attendanceDaily.empty.showAll')}</Button>}
      />
    );
  }
  if (data.coveredUntil === null) {
    return (
      <EmptyState
        icon={<FileUp />}
        title={t('attendanceDaily.empty.noLog')}
        description={canImport ? t('attendanceDaily.empty.noLogText') : t('attendanceDaily.empty.noLogAskHr')}
        actions={canImport ? <Link to="/attendance/import" className={buttonVariants()}>{t('attendanceDaily.import')}</Link> : undefined}
      />
    );
  }
  return <EmptyState icon={<Users />} title={t('attendanceDaily.empty.nobody')} description={t('attendanceDaily.empty.nobodyText')} />;
}
