import { PartyPopper } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Alert } from '@/components/ui/alert';
import { ApprovalRow } from '@/components/ui/approval-row';
import { Badge } from '@/components/ui/badge';
import { DashboardWidget } from '@/components/ui/dashboard-widget';
import { autoApproveDue } from '@/features/approval/auto-approve';
import { formatDayMonth } from '@/lib/format';
import { warningLabel } from '../approval-labels';
import type { DashboardApprovalItem } from '../approvals-api';
import { useApprovalsBlock } from '../use-approvals-block';
import { DashboardRejectDialog } from './dashboard-reject-dialog';

/** "Chờ bạn duyệt": the requests waiting for the caller, decided from the row exactly as in the Hộp thư duyệt. */
export function DashboardApprovals() {
  const { t } = useTranslation();
  const state = useApprovalsBlock();
  const { query } = state;

  const labelsFor = (item: DashboardApprovalItem) => {
    const values = { type: state.typeOf(item), name: item.request.sender.fullName };
    return {
      approve: t('dashboard.approvals.row.approve'),
      approving: t('dashboard.approvals.row.approving'),
      reject: t('dashboard.approvals.row.reject'),
      open: t('dashboard.approvals.row.open'),
      approveAria: t('dashboard.approvals.row.approveAria', values),
      rejectAria: t('dashboard.approvals.row.rejectAria', values),
      openAria: t('dashboard.approvals.row.openAria', values),
    };
  };

  const badgesFor = (item: DashboardApprovalItem) => {
    const due = item.request.autoApproveDueAt;
    return (
      <>
        {due && autoApproveDue(due).soon ? <Badge variant="warning">{t('dashboard.approvals.row.autoApprove', { date: formatDayMonth(due) })}</Badge> : null}
        {item.warnings.map((warning) => (
          <Badge key={warning.code} variant="warning">
            {warningLabel(t, warning)}
          </Badge>
        ))}
      </>
    );
  };

  const loading = query.isPending || (state.rows.length === 0 && query.isFetching);
  return (
    <div ref={state.block}>
      <DashboardWidget
        title={t('dashboard.approvals.title')}
        headingRef={state.heading}
        count={state.count}
        link={{ label: t('dashboard.approvals.link'), to: '/approvals', ariaLabel: t('dashboard.approvals.linkAria') }}
        loading={loading}
        error={query.isError && !query.data ? { title: t('dashboard.approvals.loadError'), onRetry: () => void query.refetch() } : undefined}
        empty={state.handled || state.rows.length > 0 ? undefined : { icon: <PartyPopper />, title: t('dashboard.approvals.empty.title'), text: t('dashboard.approvals.empty.text') }}
      >
        {state.handled ? (
          <Alert variant="warning" title={state.handled} className="mb-2" />
        ) : null}
        {state.rows.length > 0 ? (
          <ul aria-label={t('dashboard.approvals.title')}>
            {state.rows.map((item) => {
              const { request } = item;
              const type = t(`approvals.type.${request.type}`);
              return (
                <ApprovalRow
                  key={request.id}
                  sender={request.sender.fullName}
                  title={t('dashboard.approvals.row.title', { type, name: request.sender.fullName })}
                  to={`/approvals/${request.id}`}
                  what={request.summary}
                  unitLevel={[request.sender.orgUnitName, t('dashboard.approvals.row.level', { level: request.level, count: request.levelCount })].filter(Boolean).join(' · ')}
                  badges={badgesFor(item)}
                  needsOpening={!item.quickApprovable}
                  busy={state.busyId === request.id}
                  rejectRef={(element) => state.keepRejectButton(request.id, element)}
                  result={state.results[request.id]}
                  labels={labelsFor(item)}
                  onApprove={() => state.approve(item)}
                  onReject={() => state.askReject(item)}
                />
              );
            })}
          </ul>
        ) : null}
      </DashboardWidget>
      <DashboardRejectDialog
        target={state.rejecting ? { typeLabel: state.typeOf(state.rejecting), name: state.rejecting.request.sender.fullName } : null}
        pending={state.busyId !== null}
        fallbackFocus={state.rejectButton}
        onConfirm={state.reject}
        onCancel={state.cancelReject}
      />
    </div>
  );
}
