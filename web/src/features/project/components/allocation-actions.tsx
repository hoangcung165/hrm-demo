// Holds the open allocation dialog of a project detail (allocate or edit, end early, delete) and offers the actions
// that open them to the button and the rows below it. Only for whoever may edit a project that is not closed.
import { useMemo, useRef, useState, type ReactNode } from 'react';
import { AllocationActionsContext, type AllocationActions } from '../allocation-actions-context';
import type { Allocation, Project } from '../api';
import { AllocationDeleteDialog } from './allocation-delete-dialog';
import { AllocationDialog } from './allocation-dialog';
import { AllocationEndDialog } from './allocation-end-dialog';

type Open = { kind: 'add' } | { kind: 'edit' | 'end' | 'delete'; allocation: Allocation } | null;

export type AllocationActionsProviderProps = { project: Project; children: ReactNode };

export function AllocationActionsProvider({ project, children }: AllocationActionsProviderProps) {
  const [open, setOpen] = useState<Open>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const allowed = project.canEdit && project.status !== 'CLOSED';
  const actions = useMemo<AllocationActions>(
    () => ({
      openAdd: () => setOpen({ kind: 'add' }),
      openEdit: (allocation) => setOpen({ kind: 'edit', allocation }),
      openEnd: (allocation) => setOpen({ kind: 'end', allocation }),
      openDelete: (allocation) => setOpen({ kind: 'delete', allocation }),
      addButtonRef,
    }),
    [],
  );
  const close = () => setOpen(null);
  return (
    <AllocationActionsContext.Provider value={allowed ? actions : null}>
      {children}
      {allowed && open?.kind === 'end' ? <AllocationEndDialog projectId={project.id} allocation={open.allocation} onClose={close} fallbackFocus={addButtonRef} /> : null}
      {allowed && open?.kind === 'delete' ? <AllocationDeleteDialog projectId={project.id} allocation={open.allocation} onClose={close} fallbackFocus={addButtonRef} /> : null}
      {allowed && (open?.kind === 'add' || open?.kind === 'edit') ? (
        <AllocationDialog
          key={open.kind === 'edit' ? open.allocation.id : 'add'}
          project={project}
          target={open.kind === 'edit' ? { mode: 'edit', allocation: open.allocation } : { mode: 'add' }}
          onClose={close}
          onSaved={close}
          onEditAgain={(allocation) => setOpen({ kind: 'edit', allocation })}
          fallbackFocus={addButtonRef}
        />
      ) : null}
    </AllocationActionsContext.Provider>
  );
}
