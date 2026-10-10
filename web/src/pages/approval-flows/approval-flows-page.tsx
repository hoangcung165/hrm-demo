// Luồng phê duyệt (HRM-12) under Hệ thống: the request types with their flows, and the flow of the type in `?type=`
// edited in place with a save bar. Needs APPROVAL_FLOW_EDIT; without it the page says so.
import { ShieldOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router';
import { buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { Loading } from '@/components/ui/loading';
import { StateBlock } from '@/components/ui/state-block';
import { APPROVAL_REQUEST_TYPES, type ApprovalRequestType } from '@/features/approval/api';
import { useApprovalFlows } from '@/features/approval/flow-api';
import { useCurrentAccount } from '@/features/auth/account-context';
import { ApprovalFlowSection } from './approval-flow-section';

export function ApprovalFlowsPage() {
  const { t } = useTranslation();
  const canEdit = useCurrentAccount().permissions.includes('APPROVAL_FLOW_EDIT');
  const flows = useApprovalFlows(canEdit);
  const [params] = useSearchParams();
  const asked = params.get('type') as ApprovalRequestType | null;
  const selected: ApprovalRequestType = asked && APPROVAL_REQUEST_TYPES.includes(asked) ? asked : 'PROFILE_UPDATE';
  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-title">{t('approvalFlows.title')}</h1>
        {canEdit ? <p className="text-ink-muted">{t('approvalFlows.intro')}</p> : null}
      </div>
      {!canEdit ? (
        <Card bare>
          <StateBlock
            variant="denied"
            icon={<ShieldOff />}
            title={t('approvalFlows.denied.title')}
            description={t('approvalFlows.denied.text')}
            actions={
              <Link to="/approvals" className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
                {t('approvalFlows.denied.action')}
              </Link>
            }
          />
        </Card>
      ) : flows.isError ? (
        <Card bare>
          <ErrorState title={t('approvalFlows.loadError')} onRetry={() => void flows.refetch()} />
        </Card>
      ) : !flows.data ? (
        <Loading label={t('approvalFlows.loading')} />
      ) : (
        <ApprovalFlowSection flows={flows.data} selected={selected} />
      )}
    </div>
  );
}
