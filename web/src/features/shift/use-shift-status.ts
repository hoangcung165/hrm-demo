// Deactivate and reactivate a shift: the calls, their toasts and what a failure means for the page. Every call reloads
// the list, so a row shows what the server holds whatever happened.
import { useTranslation } from 'react-i18next';
import { useToast } from '@/components/ui/use-toast';
import { errorMessage } from '@/features/auth/error-message';
import { ApiError } from '@/lib/api';
import { useDeactivateShift, useReactivateShift, type Shift } from './api';

export type ShiftStatusOutcome = {
  /** The caller lost `SHIFT_EDIT` meanwhile. */
  onDenied: () => void;
};

type Action = 'deactivate' | 'reactivate';

export function useShiftStatus({ onDenied }: ShiftStatusOutcome) {
  const { t } = useTranslation();
  const toast = useToast();
  const deactivating = useDeactivateShift();
  const reactivating = useReactivateShift();

  /** Runs one action and says how it went; resolves to whether it succeeded. */
  const run = async (action: Action, shift: Shift): Promise<boolean> => {
    try {
      await (action === 'deactivate' ? deactivating : reactivating).mutateAsync(shift.id);
    } catch (error) {
      toast({ variant: 'danger', message: t(`shifts.${action}.failed`, { name: shift.name }), detail: errorMessage(error, t) });
      if (error instanceof ApiError && error.status === 403) onDenied();
      return false;
    }
    toast({ variant: 'success', message: t(`shifts.${action}.done`, { name: shift.name }) });
    return true;
  };

  return {
    deactivate: (shift: Shift) => run('deactivate', shift),
    reactivate: (shift: Shift) => run('reactivate', shift),
    pending: deactivating.isPending || reactivating.isPending,
  };
}
