// Owns the add/edit unit dialog of the org page and offers its openers to the buttons below it.
import { useMemo, useRef, useState, type ReactNode } from 'react';
import { useOrgStructure } from '../api';
import { OrgUnitActionsContext, type OrgUnitActions } from '../org-unit-actions-context';
import { buildTree, findNode, ROOT_ID } from '../org-tree';
import type { OrgUnitFormTarget } from '../use-org-unit-form';
import { useUnitSelection } from '../use-unit-selection';
import { OrgUnitDialog } from './org-unit-dialog';

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
  const addButtonRef = useRef<HTMLButtonElement>(null);

  const actions = useMemo<OrgUnitActions | null>(() => {
    if (!enabled || !root) return null;
    const selected = findNode(root, unitParam);
    return {
      openAdd: (parentId) => setTarget({ mode: 'add', parentId: parentId ?? (selected?.active ? selected.id : ROOT_ID) }),
      openEdit: (unit) => setTarget({ mode: 'edit', unit }),
      addButtonRef,
    };
  }, [enabled, root, unitParam]);

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
    </OrgUnitActionsContext>
  );
}
