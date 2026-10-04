// "Chuyển {tên}": pick the new parent in a Tree picker. The dialog stays open until the move succeeds.
import type { RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { TreePicker } from '@/components/ui/tree-picker';
import { formatNumber } from '@/lib/format';
import type { OrgUnit } from '../api';
import type { OrgNode } from '../org-tree';
import { useOrgUnitMove } from '../use-org-unit-move';

export type OrgUnitMoveDialogProps = {
  unit: OrgNode;
  /** The company node with every unit under it. */
  root: OrgNode;
  onClose: () => void;
  /** After the tree has been refetched. */
  onMoved: (unit: OrgUnit) => void;
  fallbackFocus?: RefObject<HTMLElement | null>;
};

export function OrgUnitMoveDialog({ unit, root, onClose, onMoved, fallbackFocus }: OrgUnitMoveDialogProps) {
  const { t } = useTranslation();
  const move = useOrgUnitMove(unit, root, { onMoved, onClose });
  // What goes along: every employee in or below the unit, and its direct child units (the API's `childCount`).
  const employees = unit.headcountTotal > 0 ? t('org.employeeCount', { count: unit.headcountTotal, formatted: formatNumber(unit.headcountTotal) }) : null;
  const children = unit.children.length > 0 ? t('org.childUnitCount', { count: unit.children.length, formatted: formatNumber(unit.children.length) }) : null;
  const text = employees && children ? t('org.move.textBoth', { employees, children }) : (employees ?? children) ? t('org.move.textOne', { moving: employees ?? children }) : t('org.move.textNone');
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={t('org.move.title', { name: unit.name })}
      description={text}
      fallbackFocus={fallbackFocus}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('dialog.cancel')}
          </Button>
          {/* While moving the button keeps its label and is disabled. Without a choice it stays enabled and says what is missing. */}
          <Button disabled={move.saving} onClick={() => void move.submit()}>
            {t('org.move.submit')}
          </Button>
        </>
      }
    >
      {/* The picker takes the height the viewport leaves and scrolls inside it: the title, the hint and the buttons stay in view. */}
      <Field label={t('org.move.target')} required helper={t('org.move.hint')} error={move.error ? t(move.error) : undefined} className="min-h-0">
        {(control) => (
          <TreePicker
            {...control}
            ref={move.pickerRef}
            label={t('org.move.target')}
            nodes={[move.choices]}
            expandedIds={move.expandedIds}
            value={move.targetId}
            onChange={move.choose}
            onToggle={move.toggle}
            disabled={move.disabled}
            className="max-h-none min-h-36"
          />
        )}
      </Field>
    </Dialog>
  );
}
