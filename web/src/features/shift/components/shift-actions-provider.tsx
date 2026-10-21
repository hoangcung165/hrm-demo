// Owns the dialogs of the Ca làm việc page (add/edit, turn off, turn on) and offers them to the buttons below it.
import { useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useRefreshAccount } from '@/features/auth/api';
import type { Shift } from '../api';
import { ShiftActionsContext, type ShiftActions } from '../shift-actions-context';
import { useShiftStatus } from '../use-shift-status';
import { ShiftDialog } from './shift-dialog';

export type ShiftActionsProviderProps = {
  /** The Account has `SHIFT_EDIT`. */
  enabled: boolean;
  children: ReactNode;
};

type Asking = { shift: Shift; action: 'deactivate' | 'reactivate' };

export function ShiftActionsProvider({ enabled, children }: ShiftActionsProviderProps) {
  const { t } = useTranslation();
  const refreshAccount = useRefreshAccount();
  // The shift being edited, `null` for a new one; `undefined` while no form is open.
  const [open, setOpen] = useState<Shift | null | undefined>(undefined);
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
  // The permission was taken away meanwhile: reload it, and the page turns read-only.
  const onDenied = () => void refreshAccount().catch(() => {});
  const status = useShiftStatus({ onDenied });
  const ask = (action: Asking['action']) => (shift: Shift, opener: HTMLElement | null) => {
    rowButton.current = opener;
    setAsking({ shift, action });
  };
  const actions: ShiftActions | null = enabled
    ? {
        openAdd: () => {
          rowButton.current = null;
          setOpen(null);
        },
        openEdit: (shift, opener) => {
          rowButton.current = opener;
          setOpen(shift);
        },
        askDeactivate: ask('deactivate'),
        askReactivate: ask('reactivate'),
        addButtonRef,
      }
    : null;
  return (
    <ShiftActionsContext.Provider value={actions}>
      {children}
      {actions && open !== undefined ? (
        // Keyed by the shift, so another shift opens a fresh form.
        <ShiftDialog
          key={open?.id ?? 'new'}
          shift={open}
          onClose={close}
          onSaved={close}
          onGone={(reason) => {
            close();
            if (reason === 'denied') onDenied();
          }}
          fallbackFocus={fallbackFocus}
        />
      ) : null}
      {actions && asking ? (
        <ConfirmDialog
          open
          title={t(`shifts.${asking.action}.title`, { name: asking.shift.name })}
          description={t(`shifts.${asking.action}.text`)}
          confirmLabel={t(`shifts.${asking.action}.submit`)}
          variant={asking.action === 'deactivate' ? 'danger' : 'primary'}
          pending={status.pending}
          // Closes either way: a failure is said in a toast, and asking again would not change its cause.
          onConfirm={() => void status[asking.action](asking.shift).then(() => setAsking(null))}
          onCancel={() => setAsking(null)}
          fallbackFocus={fallbackFocus}
        />
      ) : null}
    </ShiftActionsContext.Provider>
  );
}
