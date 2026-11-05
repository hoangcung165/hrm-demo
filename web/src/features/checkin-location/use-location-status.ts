// Deactivate and reactivate a Địa điểm chấm công: the calls, their toasts and what a failure means for the page. Every
// call reloads the list, so a row shows what the server holds whatever happened.
import { useTranslation } from 'react-i18next';
import { useToast } from '@/components/ui/use-toast';
import { errorMessage } from '@/features/auth/error-message';
import { ApiError } from '@/lib/api';
import { useDeactivateLocation, useReactivateLocation, type CheckinLocation } from './api';

export type LocationStatusOutcome = {
  /** The caller lost `ATTENDANCE_LOCATION_EDIT` meanwhile. */
  onDenied: () => void;
};

type Action = 'deactivate' | 'reactivate';

export function useLocationStatus({ onDenied }: LocationStatusOutcome) {
  const { t } = useTranslation();
  const toast = useToast();
  const deactivating = useDeactivateLocation();
  const reactivating = useReactivateLocation();

  /** Runs one action and says how it went; resolves to whether it succeeded. */
  const run = async (action: Action, place: CheckinLocation): Promise<boolean> => {
    try {
      await (action === 'deactivate' ? deactivating : reactivating).mutateAsync(place.id);
    } catch (error) {
      toast({ variant: 'danger', message: t(`checkinLocations.${action}.failed`, { name: place.name }), detail: errorMessage(error, t) });
      if (error instanceof ApiError && error.status === 403) onDenied();
      return false;
    }
    toast({ variant: 'success', message: t(`checkinLocations.${action}.done`, { name: place.name }) });
    return true;
  };

  return {
    deactivate: (place: CheckinLocation) => run('deactivate', place),
    reactivate: (place: CheckinLocation) => run('reactivate', place),
    pending: deactivating.isPending || reactivating.isPending,
  };
}
