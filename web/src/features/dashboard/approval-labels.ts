import type { TFunction } from 'i18next';
import { formatNumber } from '@/lib/format';
import type { ApprovalWarning } from './approvals-api';

/** The Badge text of a warning: what the approver must look at before deciding. */
export function warningLabel(t: TFunction, warning: ApprovalWarning): string {
  switch (warning.code) {
    case 'leave.advance':
      return t('dashboard.approvals.warning.advance', { days: formatNumber(Math.abs(Number(warning.details.remaining ?? 0))) });
    case 'leave.over_balance':
      return t('dashboard.approvals.warning.overBalance');
    case 'leave.attachment':
      return t('dashboard.approvals.warning.attachment', { count: Number(warning.details.count ?? 0) });
  }
}
