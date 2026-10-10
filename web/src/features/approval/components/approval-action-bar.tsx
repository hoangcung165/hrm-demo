// The decision at 390 (artboard `#12 Chi tiết yêu cầu (390)`): a bar pinned to the bottom of the screen with Từ chối,
// Trả về and Duyệt; the reasons come from the same dialog as on the desktop.
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import type { ApprovalDecide } from '../use-approval-decide';

export type ApprovalActionBarProps = { decide: ApprovalDecide };

export function ApprovalActionBar({ decide }: ApprovalActionBarProps) {
  const { t } = useTranslation();
  return (
    <div
      role="group"
      aria-label={t('approvals.detail.decision.label')}
      className="sticky bottom-0 z-10 -mx-4 -mb-4 grid grid-cols-[1fr_1fr_1.3fr] gap-2 border-t border-line bg-surface px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]"
    >
      <Button variant="secondary" className="h-11 text-danger" disabled={decide.pending} onClick={() => decide.openDialog('reject')}>
        {t('approvals.detail.decision.reject')}
      </Button>
      <Button variant="secondary" className="h-11" disabled={decide.pending} onClick={() => decide.openDialog('return')}>
        {t('approvals.detail.decision.return')}
      </Button>
      <Button className="h-11" disabled={decide.pending} onClick={decide.approve}>
        {t('approvals.detail.decision.approve')}
      </Button>
    </div>
  );
}
