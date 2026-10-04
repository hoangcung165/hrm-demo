// Owns the dialogs of the org page (add/edit, move, deactivate/delete) and offers their openers to the buttons below it.
import { useMemo, useRef, useState, type ReactNode } from 'react';
import { useOrgStructure } from '../api';
import { OrgUnitActionsContext, type OrgUnitActions } from '../org-unit-actions-context';
import { buildTree, findNode, ROOT_ID } from '../org-tree';
import type { OrgUnitFormTarget } from '../use-org-unit-form';
import { useOrgUnitStatus } from '../use-org-unit-status';
import { useUnitSelection } from '../use-unit-selection';
import { OrgUnitDialog } from './org-unit-dialog';
import { OrgUnitMoveDialog } from './org-unit-move-dialog';
import { OrgUnitStatusDialog } from './org-unit-status-dialog';

export type OrgUnitActionsProviderProps = {
  /** The Account has `ORG_EDIT`. */
  enabled: boolean;
  children: ReactNode;
};

export function OrgUnitActionsProvider({ enabled, children }: OrgUnitActionsProviderProps) {
  const structure = useOrgStructure(enabled).data;
  const root = useMemo(() => (structure ? buildTree(structure) : null), [structure]);
  const { unitParam, select } = useUnitSelection();
  const [target, setTarget] = useState<OrgUnitFormTarget | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);
  // Read from the live tree, so the dialog follows a reload (and goes away with a unit that no longer exists).
  const moving = root && movingId ? findNode(root, movingId) : undefined;
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const detailHeadingRef = useRef<HTMLHeadingElement>(null);
  // Where focus goes when a status dialog closes: the menu item that opened it is gone by then.
  const statusFocus = useRef<HTMLElement | null>(null);
  const status = useOrgUnitStatus({
    // The parent becomes the selection (the company for a top-level unit), while the deleted unit is still in the tree.
    // The "more" button goes away with the unit: focus goes to the detail heading, which then names the parent.
    onDeleted: (id) => {
      statusFocus.current = detailHeadingRef.current;
      select((root && findNode(root, id)?.parentId) ?? ROOT_ID);
    },
    onReactivated: () => detailHeadingRef.current?.focus(),
  });

  const selected = root ? findNode(root, unitParam) : undefined;
  const actions: OrgUnitActions | null =
    enabled && root
      ? {
          openAdd: (parentId) => setTarget({ mode: 'add', parentId: parentId ?? (selected?.active ? selected.id : ROOT_ID) }),
          openEdit: (unit) => setTarget({ mode: 'edit', unit }),
          openMove: (unit) => setMovingId(unit.id),
          openDeactivate: (unit) => {
            statusFocus.current = moreButtonRef.current;
            status.openDeactivate(unit);
          },
          reactivate: (unit) => void status.reactivate(unit),
          openDelete: (unit) => {
            statusFocus.current = moreButtonRef.current;
            status.openDelete(unit);
          },
          statusPending: status.pending,
          addButtonRef,
          moreButtonRef,
          detailHeadingRef,
        }
      : null;

  return (
    <OrgUnitActionsContext value={actions}>
      {children}
      {root && target ? (
        <OrgUnitDialog
          target={target}
          root={root}
          fallbackFocus={addButtonRef}
          onClose={() => setTarget(null)}
          onSaved={(unit) => {
            setTarget(null);
            // The saved unit becomes the selection; the tree opens the units above it.
            select(unit.id);
          }}
        />
      ) : null}
      {root && moving ? (
        // The moved unit stays selected; the tree opens the units above its new place.
        <OrgUnitMoveDialog unit={moving} root={root} fallbackFocus={addButtonRef} onClose={() => setMovingId(null)} onMoved={() => setMovingId(null)} />
      ) : null}
      {status.target ? (
        <OrgUnitStatusDialog target={status.target} pending={status.pending} onConfirm={status.confirm} onClose={status.close} fallbackFocus={statusFocus} />
      ) : null}
    </OrgUnitActionsContext>
  );
}
