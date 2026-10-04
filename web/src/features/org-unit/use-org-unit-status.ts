// Deactivate, reactivate and delete a unit: which dialog is open, the calls, their toasts and their errors.
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/components/ui/use-toast';
import { ApiError } from '@/lib/api';
import { useDeactivateOrgUnit, useDeleteOrgUnit, useReactivateOrgUnit, type OrgUnitNotEmpty } from './api';
import type { OrgNode } from './org-tree';

/** The open dialog. `blocked` (delete only): the unit is not empty, so the dialog says why instead of asking. */
export type OrgUnitStatusTarget = { kind: 'deactivate' | 'delete'; unit: OrgNode; blocked?: OrgUnitNotEmpty };

export type OrgUnitStatusOptions = {
  /** Before the tree is refetched: move the selection off the deleted unit. */
  onDeleted: (id: string) => void;
  /** After a reactivation, whose button is gone by then. */
  onReactivated: () => void;
};

export function useOrgUnitStatus({ onDeleted, onReactivated }: OrgUnitStatusOptions) {
  const { t } = useTranslation();
  const toast = useToast();
  const [target, setTarget] = useState<OrgUnitStatusTarget | null>(null);
  const deactivation = useDeactivateOrgUnit();
  const reactivation = useReactivateOrgUnit();
  const deletion = useDeleteOrgUnit(onDeleted);
  // A slow call that ends after its dialog was closed must not close another unit's dialog.
  const closeFor = (unit: OrgNode) => setTarget((current) => (current?.unit.id === unit.id ? null : current));

  const succeed = (action: 'deactivate' | 'reactivate' | 'delete', unit: OrgNode) => {
    toast({ variant: 'success', message: t(`org.${action}.done`, { name: unit.name }) });
    closeFor(unit);
  };
  const fail = (action: 'deactivate' | 'reactivate' | 'delete', unit: OrgNode, error: unknown) => {
    const code = error instanceof ApiError ? error.code : '';
    const known = code === 'auth.forbidden' || code === 'org_unit.not_found';
    toast({ variant: 'danger', message: t(`org.${action}.failed`, { name: unit.name }), detail: known ? t(`error.${code}`) : t('state.errorHint') });
    // The unit is gone (the tree has been reloaded): nothing is left to confirm.
    if (code === 'org_unit.not_found') closeFor(unit);
  };

  const deactivate = async (unit: OrgNode) => {
    try {
      await deactivation.mutateAsync(unit.id);
      succeed('deactivate', unit);
    } catch (error) {
      fail('deactivate', unit, error);
    }
  };
  const remove = async (unit: OrgNode) => {
    try {
      await deletion.mutateAsync(unit.id);
      succeed('delete', unit);
    } catch (error) {
      if (error instanceof ApiError && error.code === 'org_unit.not_empty') {
        // The tree on screen was stale: the server knows of employees or child units. Say so with its counts.
        const { employeeCount, childCount } = error.details as Partial<OrgUnitNotEmpty>;
        setTarget({ kind: 'delete', unit, blocked: { employeeCount: employeeCount ?? 0, childCount: childCount ?? 0 } });
        return;
      }
      fail('delete', unit, error);
    }
  };

  return {
    target,
    openDeactivate: (unit: OrgNode) => setTarget({ kind: 'deactivate', unit }),
    /** Decides from the loaded tree: a unit with employees of its own or child units gets the blocked dialog. */
    openDelete: (unit: OrgNode) => {
      const notEmpty = unit.headcountDirect > 0 || unit.children.length > 0;
      setTarget({ kind: 'delete', unit, blocked: notEmpty ? { employeeCount: unit.headcountDirect, childCount: unit.children.length } : undefined });
    },
    /** Direct, without a confirm: it changes nothing else and can be undone. */
    reactivate: async (unit: OrgNode) => {
      try {
        await reactivation.mutateAsync(unit.id);
        succeed('reactivate', unit);
        onReactivated();
      } catch (error) {
        fail('reactivate', unit, error);
      }
    },
    /** The primary button of the open dialog: delete an empty unit, otherwise (confirm or blocked delete) deactivate. */
    confirm: () => {
      if (target) void (target.kind === 'delete' && !target.blocked ? remove(target.unit) : deactivate(target.unit));
    },
    close: () => setTarget(null),
    pending: deactivation.isPending || reactivation.isPending || deletion.isPending,
  };
}
