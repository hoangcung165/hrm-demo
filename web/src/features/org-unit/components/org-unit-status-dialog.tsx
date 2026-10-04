// The dialogs of deactivate and delete: "Ngừng hoạt động {tên}?", "Xóa {tên}?" and the blocked "Không xóa được {tên}".
// One Dialog for all three, so a delete the server refuses (409 `org_unit.not_empty`) turns into the blocked dialog in place.
import { useEffect, useRef, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { formatNumber } from '@/lib/format';
import type { OrgUnitStatusTarget } from '../use-org-unit-status';

export type OrgUnitStatusDialogProps = {
  target: OrgUnitStatusTarget;
  /** The call is running: the action button keeps its label and is disabled. */
  pending: boolean;
  onConfirm: () => void;
  onClose: () => void;
  fallbackFocus?: RefObject<HTMLElement | null>;
};

export function OrgUnitStatusDialog({ target: { kind, unit, blocked }, pending, onConfirm, onClose, fallbackFocus }: OrgUnitStatusDialogProps) {
  const { t } = useTranslation();
  const closeButton = useRef<HTMLButtonElement>(null);
  const counted = (key: string, count: number, values = {}) => (count > 0 ? t(key, { count, formatted: formatNumber(count), ...values }) : null);
  const name = unit.name;

  // The delete button is gone once the server refused: focus goes to "Đóng", not to the button that took its place.
  useEffect(() => {
    if (blocked) closeButton.current?.focus();
  }, [blocked]);

  let title: string;
  let text: string;
  let action: { key: string; label: string; variant: 'primary' | 'danger' } | null;
  if (kind === 'deactivate') {
    title = t('org.deactivate.title', { name });
    // Only what applies: employees of the unit itself, and child units that stay active (deactivation does not cascade).
    const employees = counted('org.deactivate.employees', unit.headcountDirect, { name });
    const children = counted('org.deactivate.children', unit.children.filter((child) => child.active).length);
    text = [employees, children, t('org.deactivate.text')].filter(Boolean).join(' ');
    action = { key: 'deactivate', label: t('org.deactivate.submit'), variant: 'primary' };
  } else if (blocked) {
    title = t('org.delete.blockedTitle', { name });
    const employees = counted('org.employeeCount', blocked.employeeCount);
    const children = counted('org.childUnitCount', blocked.childCount);
    const left = employees && children ? 'both' : employees ? 'employees' : 'children';
    // An inactive unit is already where the dialog would send it: no "or deactivate" and no button for it.
    text = t(`org.delete.${unit.active ? 'blocked' : 'blockedInactive'}.${left}`, { employees, children });
    action = unit.active ? { key: 'deactivate', label: t('org.deactivate.submit'), variant: 'primary' } : null;
  } else {
    title = t('org.delete.title', { name });
    text = t('org.delete.text', { name });
    action = { key: 'delete', label: t('org.delete.submit'), variant: 'danger' };
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={title}
      description={text}
      busy={pending}
      fallbackFocus={fallbackFocus}
      footer={
        <>
          <Button ref={closeButton} variant="secondary" onClick={onClose}>
            {t(kind === 'delete' && blocked ? 'dialog.close' : 'dialog.cancel')}
          </Button>
          {action ? (
            <Button key={action.key} variant={action.variant} disabled={pending} onClick={onConfirm}>
              {action.label}
            </Button>
          ) : null}
        </>
      }
    />
  );
}
