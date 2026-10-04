// Actions on the selected node for Accounts with ORG_EDIT. Deactivate, reactivate and delete come with HRM-03/FE-3b.
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { useOrgUnitActions } from '../org-unit-actions-context';
import { ROOT_ID, type OrgNode } from '../org-tree';

export type OrgUnitDetailActionsProps = { node: OrgNode };

export function OrgUnitDetailActions({ node }: OrgUnitDetailActionsProps) {
  const { t } = useTranslation();
  const actions = useOrgUnitActions();
  if (!actions) return null;
  return (
    <div className="flex flex-wrap gap-2 [&_button]:max-md:h-11">
      {/* The company is edited in "Thông tin công ty" and cannot move. An inactive unit only offers "Sửa" here (artboard). */}
      {node.id === ROOT_ID ? null : (
        <>
          <Button variant="secondary" size="sm" onClick={() => actions.openEdit(node)}>
            {t('org.detail.edit')}
          </Button>
          {node.active ? (
            <Button variant="secondary" size="sm" onClick={() => actions.openMove(node)}>
              {t('org.detail.move')}
            </Button>
          ) : null}
        </>
      )}
      {node.active ? (
        <Button variant="secondary" size="sm" onClick={() => actions.openAdd(node.id)}>
          {t('org.detail.addChild')}
        </Button>
      ) : null}
    </div>
  );
}
