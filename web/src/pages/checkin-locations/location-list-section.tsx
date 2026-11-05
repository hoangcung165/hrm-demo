// The Địa điểm chấm công of the company with the list's loading, empty and error states (pattern P10).
import { MapPin, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { StateBlock } from '@/components/ui/state-block';
import { useCheckinLocations } from '@/features/checkin-location/api';
import { LocationTable } from '@/features/checkin-location/components/location-table';
import { useLocationActions } from '@/features/checkin-location/location-actions-context';

export function LocationListSection() {
  const { t } = useTranslation();
  const actions = useLocationActions();
  const locations = useCheckinLocations();
  const all = locations.data;
  const none = Boolean(all) && !locations.isError && all!.length === 0;
  if (locations.isError) {
    return (
      <Card bare>
        <ErrorState title={t('checkinLocations.loadError')} description={t('state.errorHint')} onRetry={() => void locations.refetch()} />
      </Card>
    );
  }
  if (none) {
    return (
      <Card bare>
        <StateBlock
          variant="empty"
          icon={<MapPin />}
          title={t('checkinLocations.empty.title')}
          description={t('checkinLocations.empty.text')}
          actions={
            <Button size="sm" onClick={actions.openAdd}>
              <Plus aria-hidden="true" />
              {t('checkinLocations.add')}
            </Button>
          }
        />
      </Card>
    );
  }
  return <LocationTable rows={all ?? []} loading={!all} />;
}
