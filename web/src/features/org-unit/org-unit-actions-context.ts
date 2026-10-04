// The add, edit and move actions of the org page, shared by the page header, the detail panel and the empty state.
import { createContext, useContext, type RefObject } from 'react';
import type { OrgNode } from './org-tree';

export type OrgUnitActions = {
  /** Opens "Thêm đơn vị". Without `parentId` the parent is the selected unit when it is active, else the company. */
  openAdd: (parentId?: string) => void;
  openEdit: (unit: OrgNode) => void;
  /** Opens "Chuyển {tên}". */
  openMove: (unit: OrgNode) => void;
  /** For the page-level add button: it takes focus when a dialog closes and its opener is gone. */
  addButtonRef: RefObject<HTMLButtonElement | null>;
};

export const OrgUnitActionsContext = createContext<OrgUnitActions | null>(null);

/** `null` when the Account lacks `ORG_EDIT` or the tree is not loaded: render no action then. */
export function useOrgUnitActions(): OrgUnitActions | null {
  return useContext(OrgUnitActionsContext);
}
