// Owns the dialogs of the Catalogs page (add, edit) and offers their openers to the buttons below it.
import { useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import { useRefreshAccount } from '@/features/auth/api';
import { CatalogActionsContext, type CatalogActions } from '../catalog-actions-context';
import type { CatalogItem, CatalogKey } from '../api';
import { CatalogDialog } from './catalog-dialog';

export type CatalogActionsProviderProps = {
  /** The Account has `CATALOG_EDIT`. */
  enabled: boolean;
  /** The open tab: what "Thêm" adds to. */
  catalog: CatalogKey;
  children: ReactNode;
};

export function CatalogActionsProvider({ enabled, catalog, children }: CatalogActionsProviderProps) {
  const refreshAccount = useRefreshAccount();
  // The item being edited, `null` for a new one; `undefined` while no dialog is open.
  const [open, setOpen] = useState<CatalogItem | null | undefined>(undefined);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  // The row menu button that started the edit. The dialog only sees the menu item, which is gone by the time it closes.
  const rowButton = useRef<HTMLElement | null>(null);
  // Where focus goes when the opener is gone: the row's menu button while that row is still on the page (after an
  // edit it may have moved off it), else the add button.
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
  const onGone = (reason: 'denied' | 'notFound') => {
    close();
    // The permission was taken away meanwhile: reload it, and the page turns read-only.
    if (reason === 'denied') void refreshAccount().catch(() => {});
  };
  const actions: CatalogActions | null = enabled
    ? {
        openAdd: () => {
          rowButton.current = null;
          setOpen(null);
        },
        openEdit: (item, opener) => {
          rowButton.current = opener;
          setOpen(item);
        },
        addButtonRef,
      }
    : null;
  return (
    <CatalogActionsContext.Provider value={actions}>
      {children}
      {actions && open !== undefined ? (
        // Keyed by the item, so another item opens a fresh form.
        <CatalogDialog key={open?.id ?? 'new'} target={{ catalog, item: open }} onClose={close} onSaved={close} onGone={onGone} fallbackFocus={fallbackFocus} />
      ) : null}
    </CatalogActionsContext.Provider>
  );
}
