// Hộp thư duyệt (HRM-12): "Chờ tôi duyệt", "Tôi đã gửi" and "Đã xử lý" for any Account linked to an Employee; the
// flow, not a permission, decides what each person sees. The tab, search, type and page live in the URL.
import { UserCheck } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Tabs } from '@/components/ui/tabs';
import { useApprovalCounts } from '@/features/approval/api';
import { ApprovalDelegationBanner } from '@/features/approval/components/approval-delegation-banner';
import { ApprovalDelegationDialog } from '@/features/approval/components/approval-delegation-dialog';
import { INBOX_TABS, useApprovalFilters, type InboxTab } from '@/features/approval/use-approval-filters';
import { useCurrentAccount } from '@/features/auth/account-context';
import { useMediaQuery } from '@/lib/use-media-query';
import { ApprovalDelegationsSection } from './approval-delegations-section';
import { ApprovalInboxSection } from './approval-inbox-section';
import { ApprovalNoEmployee } from './approval-no-employee';

export function ApprovalsPage() {
  const { t } = useTranslation();
  const { employeeId, fullName } = useCurrentAccount();
  const [delegating, setDelegating] = useState(false);
  const compact = useMediaQuery('(max-width: 767px)');
  const filters = useApprovalFilters();
  const counts = useApprovalCounts(Boolean(employeeId));
  const count: Partial<Record<InboxTab, number>> = { WAITING: counts.data?.waiting || undefined, SENT: counts.data?.sent || undefined };
  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="min-w-0 flex-1 text-title">{t('approvals.title')}</h1>
        {employeeId ? (
          <Button className="max-md:h-11" onClick={() => setDelegating(true)}>
            <UserCheck aria-hidden="true" />
            {t('delegations.open')}
          </Button>
        ) : null}
      </div>
      {employeeId ? (
        <>
          <ApprovalDelegationBanner />
          <div className="flex flex-col gap-4">
            <Tabs
              label={t('approvals.tabs.label')}
              tabs={INBOX_TABS.map((tab) => ({ id: tab, label: t(compact ? `approvals.tabs.short.${tab}` : `approvals.tabs.${tab}`), count: count[tab] }))}
              active={filters.tab}
              onChange={filters.setTab}
              panelClassName="flex flex-col gap-4"
              scrollable={compact}
            >
              {filters.tab === 'DELEGATIONS' ? <ApprovalDelegationsSection compact={compact} /> : <ApprovalInboxSection filters={filters} compact={compact} />}
            </Tabs>
          </div>
        </>
      ) : (
        <ApprovalNoEmployee />
      )}
      {delegating ? <ApprovalDelegationDialog me={fullName} onClose={() => setDelegating(false)} /> : null}
    </div>
  );
}
