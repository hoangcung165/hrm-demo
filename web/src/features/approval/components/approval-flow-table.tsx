// The request types with their flows (artboard `#12 Cấu hình luồng phê duyệt`): the type and its levels in one line,
// auto-approve and delegation. The row of the type being edited is selected; a type is a link to its flow.
import { Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { cn } from '@/lib/utils';
import type { ApprovalRequestType } from '../api';
import type { ApprovalFlow } from '../flow-api';
import { flowSummary } from '../flow-summary';

export type ApprovalFlowTableProps = {
  flows: ApprovalFlow[];
  selected: ApprovalRequestType;
};

const HEAD = 'border-b border-line bg-surface-muted px-3 py-2 text-left text-caption font-normal text-ink-muted';
const CELL = 'border-b border-line p-3 align-top';

export function ApprovalFlowTable({ flows, selected }: ApprovalFlowTableProps) {
  const { t } = useTranslation();
  return (
    <div className="overflow-hidden rounded-md border border-line bg-surface">
      <table className="w-full border-collapse">
        <caption className="sr-only">{t('approvalFlows.caption')}</caption>
        <thead>
          <tr>
            <th className={HEAD}>{t('approvalFlows.col.type')}</th>
            <th className={cn(HEAD, 'w-24 md:w-32')}>{t('approvalFlows.col.auto')}</th>
            <th className={cn(HEAD, 'w-20 md:w-24')}>{t('approvalFlows.col.delegation')}</th>
          </tr>
        </thead>
        <tbody>
          {flows.map((flow) => {
            const current = flow.requestType === selected;
            return (
              <tr key={flow.requestType} className={cn('[&:last-child>td]:border-b-0', current ? 'bg-brand-blue-soft' : 'hover:bg-surface-muted')}>
                <td className={CELL}>
                  <Link
                    to={`?type=${flow.requestType}`}
                    aria-current={current ? 'true' : undefined}
                    className={cn('rounded-sm font-medium no-underline hover:underline', current ? 'text-brand-blue' : 'text-ink')}
                  >
                    {t(`approvals.type.${flow.requestType}`)}
                  </Link>
                  <span className="block text-caption text-ink-muted">{flowSummary(t, flow.levels)}</span>
                </td>
                <td className={cn(CELL, 'tabular-nums', flow.autoApproveDays === null && 'text-ink-muted')}>
                  {flow.autoApproveDays === null ? (
                    <span className="inline-flex items-center gap-1 whitespace-nowrap">
                      {flow.automationAllowed ? null : <Lock aria-hidden="true" className="size-4 stroke-[1.5]" />}
                      {t('approvalFlows.no')}
                    </span>
                  ) : (
                    t('approvalFlows.autoAfter', { count: flow.autoApproveDays })
                  )}
                </td>
                <td className={cn(CELL, !flow.delegationAllowed && 'text-ink-muted')}>{t(flow.delegationAllowed ? 'approvalFlows.allowed' : 'approvalFlows.no')}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
