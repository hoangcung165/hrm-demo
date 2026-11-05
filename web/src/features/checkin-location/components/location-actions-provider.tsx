// Owns the dialogs of the Địa điểm chấm công page (add/edit, make inactive, make active) and offers them to the buttons below it.
import { useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useRefreshAccount } from '@/features/auth/api';
import type { CheckinLocation } from '../api';
import { LocationActionsContext, type LocationActions } from '../location-actions-context';
import { useLocationStatus } from '../use-location-status';
import { LocationDialog } from './location-dialog';

export type LocationActionsProviderProps = { children: ReactNode };

type Asking = { place: CheckinLocation; action: 'deactivate' | 'reactivate' };

export function LocationActionsProvider({ children }: LocationActionsProviderProps) {
  const { t } = useTranslation();
  const refreshAccount = useRefreshAccount();
  // The place being edited, `null` for a new one; `undefined` while no form is open.
  const [open, setOpen] = useState<CheckinLocation | null | undefined>(undefined);
  const [asking, setAsking] = useState<Asking | null>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  // The row menu button that started the dialog. The dialog only sees the menu item, which is gone by the time it closes.
  const rowButton = useRef<HTMLElement | null>(null);
  // Where focus goes when the opener is gone: the row's menu button while that row is still on the page, else the add button.
  const fallbackFocus = useMemo<RefObject<HTMLElement | null>>(
    () => ({
      get current() {
        return rowButton.current?.isConnected ? rowButton.current : addButtonRef.current;
      },
      set current(_element) {},
    }),
    [],
  );
  const close = () => setOpen(undefined);
  // The permission was taken away meanwhile: reload it, and the page turns to its denied state.
  const onDenied = () => void refreshAccount().catch(() => {});
  const status = useLocationStatus({ onDenied });
  const ask = (action: Asking['action']) => (place: CheckinLocation, opener: HTMLElement | null) => {
    rowButton.current = opener;
    setAsking({ place, action });
  };
  const actions: LocationActions = {
    openAdd: () => {
      rowButton.current = null;
      setOpen(null);
    },
    openEdit: (place, opener) => {
      rowButton.current = opener;
      setOpen(place);
    },
    askDeactivate: ask('deactivate'),
    askReactivate: ask('reactivate'),
    addButtonRef,
  };
  return (
    <LocationActionsContext.Provider value={actions}>
      {children}
      {open !== undefined ? (
        // Keyed by the place, so another place opens a fresh form.
        <LocationDialog
          key={open?.id ?? 'new'}
          place={open}
          onClose={close}
          onSaved={close}
          onGone={(reason) => {
            close();
            if (reason === 'denied') onDenied();
          }}
          fallbackFocus={fallbackFocus}
        />
      ) : null}
      {asking ? (
        <ConfirmDialog
          open
          title={t(`checkinLocations.${asking.action}.title`, { name: asking.place.name })}
          description={t(`checkinLocations.${asking.action}.text`)}
          confirmLabel={t(`checkinLocations.${asking.action}.submit`)}
          variant={asking.action === 'deactivate' ? 'danger' : 'primary'}
          pending={status.pending}
          // Closes either way: a failure is said in a toast, and asking again would not change its cause.
          onConfirm={() => void status[asking.action](asking.place).then(() => setAsking(null))}
          onCancel={() => setAsking(null)}
          fallbackFocus={fallbackFocus}
        />
      ) : null}
    </LocationActionsContext.Provider>
  );
}
