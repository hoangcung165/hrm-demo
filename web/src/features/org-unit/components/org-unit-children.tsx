// Child units of the selected node; a name selects that unit.
import { Ban } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/data-table';
import { formatNumber } from '@/lib/format';
import type { OrgNode } from '../org-tree';
import { useUnitSelection } from '../use-unit-selection';

export type OrgUnitChildrenProps = { node: OrgNode };

export function OrgUnitChildren({ node }: OrgUnitChildrenProps) {
  const { t } = useTranslation();
  const { linkProps } = useUnitSelection();
  return (
    <div className="flex flex-col gap-2 border-t border-line pt-4">
      <div className="flex items-baseline gap-2">
        <h3 className="text-body-strong">{t('org.detail.children')}</h3>
        <span className="text-caption text-ink-muted tabular-nums">{formatNumber(node.children.length)}</span>
      </div>
      {node.children.length === 0 ? (
        <p className="text-ink-muted">{t('org.detail.noChildren')}</p>
      ) : (
        <DataTable
          caption={t('org.detail.childrenCaption', { name: node.name })}
          data={node.children}
          rowKey={(child) => child.id}
          pageSize={node.children.length}
          columns={[
            {
              id: 'unit',
              header: t('org.detail.childCol'),
              cell: (child) => (
                // The link stretches over the whole cell (`after:inset-0`), so the target is as tall as the row.
                <div className="relative -m-3 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link {...linkProps(child.id)} className="font-medium text-link after:absolute after:inset-0 hover:text-brand-blue-deep">
                      {child.name}
                    </Link>
                    {child.active ? null : (
                      <Badge variant="neutral">
                        <Ban aria-hidden="true" />
                        {t('org.status.inactive')}
                      </Badge>
                    )}
                  </div>
                  <div className="text-caption text-ink-muted">{child.head?.fullName ?? t('org.detail.childNoHead')}</div>
                </div>
              ),
            },
            { id: 'headcount', header: t('org.tree.col.headcount'), numeric: true, cell: (child) => formatNumber(child.headcountTotal) },
          ]}
        />
      )}
    </div>
  );
}
