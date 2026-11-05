// The actions of the Địa điểm chấm công page (add, edit, deactivate, reactivate), shared by the page header, the empty
// state and the rows. Only mounted for an Account with `ATTENDANCE_LOCATION_EDIT`.
import { createContext, useContext, type RefObject } from 'react';
import type { CheckinLocation } from './api';

/** `opener` is the row's menu button: it takes focus back when the dialog closes, while its row is still there. */
type RowAction = (place: CheckinLocation, opener: HTMLElement | null) => void;

export type LocationActions = {
  openAdd: () => void;
  openEdit: RowAction;
  askDeactivate: RowAction;
  askReactivate: RowAction;
  /** For the page-level add button: it takes focus when a dialog closes and its opener is gone. */
  addButtonRef: RefObject<HTMLButtonElement | null>;
};

export const LocationActionsContext = createContext<LocationActions | null>(null);

export function useLocationActions(): LocationActions {
  const actions = useContext(LocationActionsContext);
  if (!actions) throw new Error('useLocationActions needs a LocationActionsProvider');
  return actions;
}
