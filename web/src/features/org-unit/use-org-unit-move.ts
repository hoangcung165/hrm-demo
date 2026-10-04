// State of "Chuyển đơn vị": the picker's nodes, the chosen target, the move itself, its errors and the toasts.
import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/components/ui/use-toast';
import { ApiError } from '@/lib/api';
import { useMoveOrgUnit, type OrgUnit } from './api';
import { findNode, flatten, moveChoices, ROOT_ID, type OrgNode } from './org-tree';

// Shown under the picker; any other failure is a toast.
const FIELD_ERRORS = ['org_unit.move_into_self_or_descendant', 'org_unit.parent_inactive', 'org_unit.parent_not_found'];

export type OrgUnitMoveOptions = { onMoved: (unit: OrgUnit) => void; onClose: () => void };

export function useOrgUnitMove(unit: OrgNode, root: OrgNode, { onMoved, onClose }: OrgUnitMoveOptions) {
  const { t } = useTranslation();
  const toast = useToast();
  const move = useMoveOrgUnit();
  const pickerRef = useRef<HTMLDivElement>(null);
  const [targetId, setTargetId] = useState<string | null>(null);
  /** An i18n key. */
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());

  const choices = useMemo(() => moveChoices(root, unit), [root, unit]);
  const all = useMemo(() => flatten(choices), [choices]);
  // The tree is reloaded after a failed move: a target that is gone or blocked by then is no longer chosen.
  const target = all.find((choice) => choice.id === targetId && !choice.blocked) ?? null;

  const fail = (key: string) => {
    setError(key);
    pickerRef.current?.querySelector<HTMLElement>('[tabindex="0"]')?.focus();
  };

  const submit = async () => {
    if (!target) return fail('org.move.targetRequired');
    const from = findNode(root, unit.parentId)?.name ?? root.name;
    try {
      const moved = await move.mutateAsync({ id: unit.id, parentId: target.id === ROOT_ID ? null : target.id });
      toast({ variant: 'success', message: t('org.move.moved', { name: moved.name }), detail: t('org.move.movedDetail', { from, to: target.name }) });
      onMoved(moved);
    } catch (caught) {
      const code = caught instanceof ApiError ? caught.code : '';
      if (FIELD_ERRORS.includes(code)) return fail(`error.${code}`);
      const known = code === 'auth.forbidden' || code === 'org_unit.not_found';
      toast({ variant: 'danger', message: t('org.move.failed', { name: unit.name }), detail: known ? t(`error.${code}`) : t('state.errorHint') });
      // The unit itself is gone: nothing is left to move.
      if (code === 'org_unit.not_found') onClose();
    }
  };

  return {
    pickerRef,
    choices,
    /** Everything is open at first. */
    expandedIds: useMemo(() => new Set(all.map((choice) => choice.id).filter((id) => !collapsed.has(id))), [all, collapsed]),
    toggle: (id: string) =>
      setCollapsed((current) => {
        const next = new Set(current);
        if (!next.delete(id)) next.add(id);
        return next;
      }),
    disabled: useMemo(
      () => Object.fromEntries(all.flatMap((choice) => (choice.blocked ? [[choice.id, t(`org.move.reason.${choice.blocked}`)]] : []))) as Record<string, string>,
      [all, t],
    ),
    targetId: target?.id ?? null,
    choose: (id: string) => {
      setTargetId(id);
      setError(null);
    },
    error,
    submit,
    saving: move.isPending,
  };
}
