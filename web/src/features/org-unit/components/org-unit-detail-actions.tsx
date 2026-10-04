// Actions on the selected node for Accounts with ORG_EDIT: buttons, and the "more" menu with deactivate and delete.
import { Ban, Ellipsis, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Menu, type MenuItem } from '@/components/ui/menu';
import { useOrgUnitActions } from '../org-unit-actions-context';
import { ROOT_ID, type OrgNode } from '../org-tree';

export type OrgUnitDetailActionsProps = { node: OrgNode };

export function OrgUnitDetailActions({ node }: OrgUnitDetailActionsProps) {
  const { t } = useTranslation();
  const actions = useOrgUnitActions();
  if (!actions) return null;
  // The company is edited in "Thông tin công ty"; it cannot move, be deactivated or be deleted.
  const isUnit = node.id !== ROOT_ID;
  const more: MenuItem[] = [
    ...(node.active ? [{ id: 'deactivate', label: t('org.detail.deactivate'), icon: <Ban aria-hidden="true" />, onSelect: () => actions.openDeactivate(node) }] : []),
    { id: 'delete', label: t('org.detail.delete'), icon: <Trash2 aria-hidden="true" />, danger: true, separated: node.active, onSelect: () => actions.openDelete(node) },
  ];
  return (
    <div className="flex flex-wrap gap-2 [&_button]:max-md:h-11">
      {/* An inactive unit offers "Kích hoạt lại · Sửa · ⋯" (artboard): it cannot move or get child units. */}
      {isUnit && !node.active ? (
        <Button variant="secondary" size="sm" disabled={actions.statusPending} onClick={() => actions.reactivate(node)}>
          {t('org.detail.reactivate')}
        </Button>
      ) : null}
      {isUnit ? (
        <Button variant="secondary" size="sm" onClick={() => actions.openEdit(node)}>
          {t('org.detail.edit')}
        </Button>
      ) : null}
      {isUnit && node.active ? (
        <Button variant="secondary" size="sm" onClick={() => actions.openMove(node)}>
          {t('org.detail.move')}
        </Button>
      ) : null}
      {node.active ? (
        <Button variant="secondary" size="sm" onClick={() => actions.openAdd(node.id)}>
          {t('org.detail.addChild')}
        </Button>
      ) : null}
      {isUnit ? (
        // Keyed by the unit: after a delete the button of the deleted unit is gone, and focus goes to the detail heading.
        <Menu
          key={node.id}
          items={more}
          trigger={
            <Button ref={actions.moreButtonRef} variant="secondary" size="icon-sm" aria-label={t('org.detail.more', { name: node.name })} className="max-md:w-11">
              <Ellipsis aria-hidden="true" />
            </Button>
          }
        />
      ) : null}
    </div>
  );
}
