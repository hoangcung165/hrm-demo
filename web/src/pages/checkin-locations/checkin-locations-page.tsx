// Địa điểm chấm công (HRM-39; Hệ thống › Địa điểm chấm công): the places where an Employee may check in from the phone,
// and the company-wide rules of that check-in. Needs ATTENDANCE_LOCATION_EDIT; without it the page is the denied state
// (and the sidebar has no entry for it).
import { Plus, ShieldOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StateBlock } from '@/components/ui/state-block';
import { useCurrentAccount } from '@/features/auth/account-context';
import { LocationActionsProvider } from '@/features/checkin-location/components/location-actions-provider';
import { RulesCard } from '@/features/checkin-location/components/rules-card';
import { useLocationActions } from '@/features/checkin-location/location-actions-context';
import { LocationListSection } from './location-list-section';

export function CheckinLocationsPage() {
  const { t } = useTranslation();
  const { permissions } = useCurrentAccount();
  if (!permissions.includes('ATTENDANCE_LOCATION_EDIT')) {
    return (
      <div className="flex flex-col gap-4 md:gap-6">
        <h1 className="text-title">{t('checkinLocations.title')}</h1>
        <Card bare>
          <StateBlock variant="denied" icon={<ShieldOff />} title={t('checkinLocations.denied.title')} description={t('checkinLocations.denied.text')} />
        </Card>
      </div>
    );
  }
  return (
    <LocationActionsProvider>
      <div className="flex flex-col gap-4 md:gap-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h1 className="text-title">{t('checkinLocations.title')}</h1>
            <p className="text-body-small text-ink-muted">{t('checkinLocations.intro')}</p>
          </div>
          <AddButton />
        </div>
        <LocationListSection />
        <RulesCard />
      </div>
    </LocationActionsProvider>
  );
}

/** "Thêm địa điểm chấm công". */
function AddButton() {
  const { t } = useTranslation();
  const actions = useLocationActions();
  return (
    <Button ref={actions.addButtonRef} onClick={actions.openAdd} className="max-md:h-11">
      <Plus aria-hidden="true" />
      {t('checkinLocations.add')}
    </Button>
  );
}
