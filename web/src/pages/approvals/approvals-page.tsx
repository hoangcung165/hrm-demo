// Hộp thư duyệt (HRM-12): "Chờ tôi duyệt", "Tôi đã gửi" and "Đã xử lý" for any Account linked to an Employee; the
// flow, not a permission, decides what each person sees. The tab, search, type and page live in the URL.
import { useTranslation } from 'react-i18next';
import { Tabs } from '@/components/ui/tabs';
import { APPROVAL_BOXES, useApprovalCounts, type ApprovalBox } from '@/features/approval/api';
import { ApprovalDelegationBanner } from '@/features/approval/components/approval-delegation-banner';
import { useApprovalFilters } from '@/features/approval/use-approval-filters';
import { useCurrentAccount } from '@/features/auth/account-context';
import { useMediaQuery } from '@/lib/use-media-query';
import { ApprovalInboxSection } from './approval-inbox-section';
import { ApprovalNoEmployee } from './approval-no-employee';

export function ApprovalsPage() {
  const { t } = useTranslation();
  const { employeeId } = useCurrentAccount();
  const compact = useMediaQuery('(max-width: 767px)');
  const filters = useApprovalFilters();
  const counts = useApprovalCounts(Boolean(employeeId));
  const count: Partial<Record<ApprovalBox, number>> = { WAITING: counts.data?.waiting || undefined, SENT: counts.data?.sent || undefined };
  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <h1 className="text-title">{t('approvals.title')}</h1>
      {employeeId ? (
        <>
          <ApprovalDelegationBanner />
          <div className="flex flex-col gap-4">
            <Tabs
              label={t('approvals.tabs.label')}
              tabs={APPROVAL_BOXES.map((box) => ({ id: box, label: t(compact ? `approvals.tabs.short.${box}` : `approvals.tabs.${box}`), count: count[box] }))}
              active={filters.query.box}
              onChange={filters.setBox}
              panelClassName="flex flex-col gap-4"
            >
              <ApprovalInboxSection filters={filters} compact={compact} />
            </Tabs>
          </div>
        </>
      ) : (
        <ApprovalNoEmployee />
      )}
    </div>
  );
}
