// The unit tree card: toolbar, rows, and the empty and no-match states.
import { Network, Plus, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { StateBlock } from '@/components/ui/state-block';
import { Tree, type TreeNode } from '@/components/ui/tree';
import { formatNumber } from '@/lib/format';
import { useMediaQuery } from '@/lib/use-media-query';
import { useOrgUnitActions } from '../org-unit-actions-context';
import type { OrgNode } from '../org-tree';
import { useOrgTreeView } from '../use-org-tree-view';
import { OrgTreeToolbar } from './org-tree-toolbar';

export type OrgUnitTreeProps = {
  /** The company node with every unit under it. */
  root: OrgNode;
  selectedId: string;
  onSelect: (id: string) => void;
  className?: string;
};

export function OrgUnitTree({ root, selectedId, onSelect, className }: OrgUnitTreeProps) {
  const { t } = useTranslation();
  const compact = useMediaQuery('(max-width: 767px)');
  const view = useOrgTreeView(root, selectedId);
  const actions = useOrgUnitActions();
  const empty = root.children.length === 0;

  const toTreeNode = (node: OrgNode): TreeNode => ({
    id: node.id,
    name: node.name,
    ariaLabel: [
      t('org.tree.rowLabel', {
        name: node.name,
        type: t(`org.type.${node.type}`),
        head: node.head?.fullName ?? t('org.tree.rowNoHead'),
        employees: t('org.employeeCount', { count: node.headcountTotal, formatted: formatNumber(node.headcountTotal) }),
      }),
      ...(node.active ? [] : [t('org.status.inactive')]),
    ].join(', '),
    typeLabel: t(`org.type.${node.type}`),
    head: node.head ? { name: node.head.fullName, avatarUrl: node.head.avatarUrl } : null,
    number: node.headcountTotal,
    active: node.active,
    muted: node.muted,
    children: node.children.map(toTreeNode),
  });

  return (
    <Tree
      label={t('org.tree.label')}
      nodes={view.visibleRoot ? [toTreeNode(view.visibleRoot)] : []}
      expandedIds={view.expandedIds}
      selectedId={selectedId}
      onToggle={view.toggle}
      onSelect={onSelect}
      variant={compact ? 'compact' : 'default'}
      toolbar={empty ? undefined : <OrgTreeToolbar view={view} />}
      labels={{
        unit: t('org.tree.col.unit'),
        type: t('org.tree.col.type'),
        head: t('org.tree.col.head'),
        number: t('org.tree.col.headcount'),
        inactive: t('org.status.inactive'),
        vacant: t('org.tree.noHead'),
      }}
      className={className}
    >
      {empty ? (
        <StateBlock
          variant="empty"
          icon={<Network />}
          title={t('org.tree.empty.title')}
          description={t(actions ? 'org.tree.empty.textEdit' : 'org.tree.empty.text', { company: root.name })}
          actions={
            actions ? (
              <Button onClick={() => actions.openAdd()}>
                <Plus aria-hidden="true" />
                {t('org.add')}
              </Button>
            ) : undefined
          }
        />
      ) : view.visibleRoot ? null : (
        <StateBlock
          variant="plain"
          icon={<Search />}
          title={t('org.tree.noMatch.title', { query: view.query.trim() })}
          description={t('org.tree.noMatch.text')}
          actions={
            <Button variant="secondary" size="sm" onClick={() => view.setQuery('')}>
              {t('org.tree.clearSearch')}
            </Button>
          }
        />
      )}
    </Tree>
  );
}
