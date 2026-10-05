// "Cây đơn vị" tab: the unit tree with the selected node's detail beside it (under it below 1440px).
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tree } from '@/components/ui/tree';
import { useOrgStructure } from '@/features/org-unit/api';
import { OrgUnitDetail } from '@/features/org-unit/components/org-unit-detail';
import { OrgUnitTree } from '@/features/org-unit/components/org-unit-tree';
import { buildTree, findNode } from '@/features/org-unit/org-tree';
import { useUnitSelection } from '@/features/org-unit/use-unit-selection';
import { OrgLoadError } from './org-load-error';

// Side by side from the artboard width (1440) in its proportions, 688 : 424; stacked below, where the tree needs the full width.
const LAYOUT = 'flex flex-col items-start gap-6 min-[1440px]:grid min-[1440px]:grid-cols-[minmax(0,688fr)_minmax(0,424fr)]';

export function OrgTreeSection() {
  const { t } = useTranslation();
  const structure = useOrgStructure();
  const { unitParam, select } = useUnitSelection();
  const root = useMemo(() => (structure.data ? buildTree(structure.data) : null), [structure.data]);

  if (structure.isError) return <OrgLoadError error={structure.error} onRetry={() => void structure.refetch()} />;
  // An unknown or stale `?unit=` falls back to the company node.
  const node = root ? (findNode(root, unitParam) ?? root) : null;
  return (
    <div className={LAYOUT}>
      {root && node ? (
        <>
          <OrgUnitTree root={root} selectedId={node.id} onSelect={select} className="w-full" />
          <OrgUnitDetail node={node} parent={findNode(root, node.parentId)} className="w-full" />
        </>
      ) : (
        <>
          <Tree
            loading
            label={t('org.loading')}
            nodes={[]}
            expandedIds={new Set()}
            selectedId={null}
            onToggle={() => {}}
            onSelect={() => {}}
            labels={{ unit: t('org.tree.col.unit'), type: t('org.tree.col.type'), head: t('org.tree.col.head'), number: t('org.tree.col.headcount'), inactive: '', vacant: '' }}
            className="w-full"
          />
          <Card busy label={t('org.loadingDetail')} className="w-full">
            <Skeleton className="w-[60%]" />
            <Skeleton className="w-[80%]" />
            <Skeleton className="w-[50%]" />
          </Card>
        </>
      )}
    </div>
  );
}
