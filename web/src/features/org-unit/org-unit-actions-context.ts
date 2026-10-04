// The actions of the org page (add, edit, move, deactivate, reactivate, delete), shared by the page header, the detail panel and the empty state.
import { createContext, useContext, type RefObject } from 'react';
import type { OrgNode } from './org-tree';

export type OrgUnitActions = {
  /** Opens "Thêm đơn vị". Without `parentId` the parent is the selected unit when it is active, else the company. */
  openAdd: (parentId?: string) => void;
  openEdit: (unit: OrgNode) => void;
  /** Opens "Chuyển {tên}". */
  openMove: (unit: OrgNode) => void;
  /** Opens "Ngừng hoạt động {tên}?". */
  openDeactivate: (unit: OrgNode) => void;
  /** Reactivates at once and says so in a toast. */
  reactivate: (unit: OrgNode) => void;
  /** Opens "Xóa {tên}?", or "Không xóa được {tên}" when the unit has employees or child units. */
  openDelete: (unit: OrgNode) => void;
  /** A deactivate, reactivate or delete call is running. */
  statusPending: boolean;
  /** For the page-level add button: it takes focus when a dialog closes and its opener is gone. */
  addButtonRef: RefObject<HTMLButtonElement | null>;
  /** For the "more" button of the detail: it takes focus back when the dialog of one of its menu items closes. */
  moreButtonRef: RefObject<HTMLButtonElement | null>;
  /** For the heading of the detail card: it takes focus when the action that had it is gone (after a delete or a reactivation). */
  detailHeadingRef: RefObject<HTMLHeadingElement | null>;
};

export const OrgUnitActionsContext = createContext<OrgUnitActions | null>(null);

/** `null` when the Account lacks `ORG_EDIT` or the tree is not loaded: render no action then. */
export function useOrgUnitActions(): OrgUnitActions | null {
  return useContext(OrgUnitActionsContext);
}
