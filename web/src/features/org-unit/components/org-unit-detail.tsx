// Detail of the selected node: the company or one unit, with its actions for Accounts that may edit.
import { Ban } from 'lucide-react';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { DetailList, type DetailListItem } from '@/components/ui/detail-list';
import { Person } from '@/components/ui/person';
import { formatNumber } from '@/lib/format';
import { useOrgUnitActions } from '../org-unit-actions-context';
import { ROOT_ID, type OrgNode } from '../org-tree';
import { useFocusAfterDetailLink, useUnitSelection } from '../use-unit-selection';
import { OrgUnitChildren } from './org-unit-children';
import { OrgUnitDetailActions } from './org-unit-detail-actions';

export type OrgUnitDetailProps = {
  node: OrgNode;
  /** `undefined` for the company node. */
  parent: OrgNode | undefined;
  className?: string;
};

export function OrgUnitDetail({ node, parent, className }: OrgUnitDetailProps) {
  const { t } = useTranslation();
  const { linkProps } = useUnitSelection();
  const ownHeading = useRef<HTMLHeadingElement>(null);
  // With actions, their provider holds the ref: it moves focus here after a delete or a reactivation.
  const heading = useOrgUnitActions()?.detailHeadingRef ?? ownHeading;
  useFocusAfterDetailLink(heading);
  const isCompany = node.id === ROOT_ID;
  const type = t(`org.type.${node.type}`);
  const head = node.head;
  const below = node.headcountTotal - node.headcountDirect;

  const items: DetailListItem[] = [
    ...(isCompany ? [] : [{ label: t('org.detail.code'), value: node.code }]),
    { label: t('org.detail.type'), value: type },
    ...(parent
      ? [
          {
            label: t('org.detail.parent'),
            value: (
              <Link {...linkProps(parent.id)} className="text-link hover:text-brand-blue-deep">
                {parent.name}
              </Link>
            ),
          },
        ]
      : []),
    {
      label: t(isCompany ? 'org.detail.representative' : 'org.detail.head'),
      value: head ? (
        <Person size="md" wrapCaption name={head.fullName} src={head.avatarUrl} caption={[head.employeeCode, head.position].filter(Boolean).join(' · ')} />
      ) : (
        <span className="text-ink-muted">{t('org.detail.noHead')}</span>
      ),
    },
    {
      label: t('org.detail.headcount'),
      value: (
        <>
          <span className="font-medium tabular-nums">{formatNumber(node.headcountTotal)}</span>
          {node.children.length > 0 && node.headcountTotal > 0 ? (
            <div className="text-caption text-ink-muted tabular-nums">
              {t(isCompany ? 'org.detail.rootBreakdown' : 'org.detail.breakdown', {
                direct: formatNumber(node.headcountDirect),
                below: formatNumber(below),
              })}
            </div>
          ) : null}
        </>
      ),
    },
  ];

  return (
    <Card
      title={node.name}
      titleRef={heading}
      description={isCompany ? type : `${type} · ${node.code}`}
      titleAside={
        isCompany ? undefined : node.active ? (
          <Badge variant="success">{t('org.status.active')}</Badge>
        ) : (
          <Badge variant="neutral">
            <Ban aria-hidden="true" />
            {t('org.status.inactive')}
          </Badge>
        )
      }
      className={className}
    >
      <OrgUnitDetailActions node={node} />
      <DetailList items={items} />
      <OrgUnitChildren node={node} />
    </Card>
  );
}
