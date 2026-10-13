// The allocation actions of a project (allocate, edit, end early, delete), shared by the "Phân bổ nhân sự" button and
// the row menus. `null` when the viewer may not edit the project, or it is closed: render no action then.
import { createContext, useContext, type RefObject } from 'react';
import type { Allocation } from './api';

export type AllocationActions = {
  openAdd: () => void;
  openEdit: (allocation: Allocation) => void;
  openEnd: (allocation: Allocation) => void;
  openDelete: (allocation: Allocation) => void;
  /** The "Phân bổ nhân sự" button: it takes focus when a dialog closes and its opener is gone. */
  addButtonRef: RefObject<HTMLButtonElement | null>;
};

export const AllocationActionsContext = createContext<AllocationActions | null>(null);

export function useAllocationActions(): AllocationActions | null {
  return useContext(AllocationActionsContext);
}
