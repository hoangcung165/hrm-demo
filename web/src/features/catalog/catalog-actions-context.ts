// The actions of the Catalogs page (add and edit for now), shared by the page header, the empty state and the rows.
import { createContext, useContext, type RefObject } from 'react';
import type { CatalogItem } from './api';

/** `opener` is the row's menu button: it takes focus back when the dialog closes. */
type RowAction = (item: CatalogItem, opener: HTMLElement | null) => void;

export type CatalogActions = {
  /** Opens "Thêm {mục}" for the open tab. */
  openAdd: () => void;
  /** Opens "Sửa {mục}: {tên}". */
  openEdit: RowAction;
  /** For the page-level add button: it takes focus when a dialog closes and its opener is gone. */
  addButtonRef: RefObject<HTMLButtonElement | null>;
};

export const CatalogActionsContext = createContext<CatalogActions | null>(null);

/** `null` when the Account lacks `CATALOG_EDIT`: render no action then. */
export function useCatalogActions(): CatalogActions | null {
  return useContext(CatalogActionsContext);
}
