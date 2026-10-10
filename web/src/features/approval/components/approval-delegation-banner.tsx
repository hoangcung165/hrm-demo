// The banners above the inbox tabs while an Ủy quyền duyệt is in force: the caller stands in for someone (their
// requests carry "Duyệt thay"), or handed their own approvals to someone and can still approve.
import { Trans, useTranslation } from 'react-i18next';
import { Alert } from '@/components/ui/alert';
import { formatDate } from '@/lib/format';
import { useApprovalDelegations, type ApprovalDelegation } from '../api';

const bold = { b: <b className="font-semibold" /> };

export function ApprovalDelegationBanner() {
  const { t } = useTranslation();
  const delegations = useApprovalDelegations();
  if (!delegations.data) return null;
  const active = (list: ApprovalDelegation[]) => list.filter((d) => d.status === 'ACTIVE');
  const received = active(delegations.data.received);
  const given = active(delegations.data.given);
  if (received.length === 0 && given.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      {received.length === 1 ? (
        <Alert
          variant="info"
          title={<Trans i18nKey="approvals.delegate.received" values={{ name: received[0]!.delegator.fullName, date: formatDate(received[0]!.endDate) }} components={bold} />}
        />
      ) : received.length > 1 ? (
        <Alert
          variant="info"
          title={t('approvals.delegate.receivedMany', {
            count: received.length,
            names: received.map((d) => `${d.delegator.fullName} (${formatDate(d.endDate)})`).join(', '),
          })}
        />
      ) : null}
      {given.map((d) => (
        <Alert key={d.id} variant="info" title={<Trans i18nKey="approvals.delegate.given" values={{ name: d.delegate.fullName, date: formatDate(d.endDate) }} components={bold} />} />
      ))}
    </div>
  );
}
