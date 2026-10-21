// Lịch phân ca (HRM-22; Chấm công và nghỉ phép › Lịch phân ca): who works which shift, by week or month, over the people the Account
// may see. Needs SHIFT_VIEW; anyone else gets the denied state. Read-only here: shifts are assigned in the next slice.
// The range, filters and page are in the URL.
import { ShieldOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { StateBlock } from '@/components/ui/state-block';
import { useCurrentAccount } from '@/features/auth/account-context';
import { ShiftCalendarContent } from '@/features/shift/components/shift-calendar-content';
import { useShiftCalendarFilters } from '@/features/shift/use-calendar-filters';
import { useMediaQuery } from '@/lib/use-media-query';

export function ShiftCalendarPage() {
  const { t } = useTranslation();
  const compact = useMediaQuery('(max-width: 767px)');
  const filters = useShiftCalendarFilters(compact);
  const allowed = useCurrentAccount().permissions.includes('SHIFT_VIEW');
  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-title">{t('shiftCalendar.title')}</h1>
        <p className="text-body-small text-ink-muted">{t('shiftCalendar.intro')}</p>
      </div>
      {allowed ? (
        <ShiftCalendarContent filters={filters} compact={compact} />
      ) : (
        <Card bare>
          <StateBlock variant="denied" icon={<ShieldOff />} title={t('shiftCalendar.denied.title')} description={t('shiftCalendar.denied.text')} />
        </Card>
      )}
    </div>
  );
}
