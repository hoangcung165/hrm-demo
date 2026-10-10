// "Thay đổi đề xuất" of a Cập nhật hồ sơ request: each changed field with its value when sent and the proposed one,
// and the sender's note. A table from 768px; below, each field is a block with the proposal first.
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { formatPhone } from '@/lib/format';
import { useProfileUpdate, type ContactField, type ProfileUpdateChange } from '../api';

const PHONES: ContactField[] = ['PHONE', 'EMERGENCY_CONTACT_PHONE'];
const SUB: ContactField[] = ['EMERGENCY_CONTACT_NAME', 'EMERGENCY_CONTACT_RELATIONSHIP', 'EMERGENCY_CONTACT_PHONE'];

export type ProfileUpdateChangesProps = {
  requestId: string;
  senderName: string;
  /** The last level approved: the values are on the profile now. */
  applied: boolean;
  compact: boolean;
};

export function ProfileUpdateChanges({ requestId, senderName, applied, compact }: ProfileUpdateChangesProps) {
  const { t } = useTranslation();
  const content = useProfileUpdate(requestId);
  const value = (change: ProfileUpdateChange, which: 'oldValue' | 'newValue') => {
    const raw = change[which];
    if (!raw) return t('approvals.detail.changes.empty');
    return PHONES.includes(change.field) ? formatPhone(raw) : raw;
  };
  const label = (change: ProfileUpdateChange) => (
    <>
      {t(`approvals.detail.changes.field.${change.field}`)}
      {SUB.includes(change.field) ? <span className="block text-caption text-ink-muted">{t(`approvals.detail.changes.sub.${change.field}`)}</span> : null}
    </>
  );
  if (content.isError) {
    return (
      <Card bare>
        <ErrorState title={t('approvals.detail.changes.loadError')} onRetry={() => void content.refetch()} />
      </Card>
    );
  }
  const changes = content.data?.changes ?? [];
  const count = changes.length;
  return (
    <Card
      title={t('approvals.detail.changes.title')}
      description={content.data ? t(applied ? 'approvals.detail.changes.applied' : 'approvals.detail.changes.description', { count }) : undefined}
    >
      <div className="flex flex-col gap-4">
        {!content.data ? (
          <div role="status" aria-busy="true" aria-label={t('approvals.detail.loading')} className="flex flex-col gap-3">
            <Skeleton className="w-[70%]" />
            <Skeleton className="w-[55%]" />
          </div>
        ) : compact ? (
          <dl className="flex flex-col gap-4">
            {changes.map((change) => (
              <div key={change.field} className="flex flex-col gap-0.5">
                <dt className="text-caption text-ink-muted">
                  {t(`approvals.detail.changes.field.${change.field}`)}
                  {SUB.includes(change.field) ? ` · ${t(`approvals.detail.changes.sub.${change.field}`)}` : ''}
                </dt>
                <dd className="font-medium tabular-nums [overflow-wrap:anywhere]">{value(change, 'newValue')}</dd>
                <dd className="text-caption text-ink-muted tabular-nums [overflow-wrap:anywhere]">
                  {t('approvals.detail.changes.col.old')}: <s>{value(change, 'oldValue')}</s>
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <table className="w-full border-collapse text-left">
            <caption className="sr-only">{t('approvals.detail.changes.caption')}</caption>
            <thead>
              <tr className="text-caption text-ink-muted">
                <th className="w-44 border-b border-line bg-surface-muted px-3 py-2 font-normal">{t('approvals.detail.changes.col.field')}</th>
                <th className="border-b border-line bg-surface-muted px-3 py-2 font-normal">{t('approvals.detail.changes.col.old')}</th>
                <th className="border-b border-line bg-surface-muted px-3 py-2 font-normal">{t('approvals.detail.changes.col.new')}</th>
              </tr>
            </thead>
            <tbody>
              {changes.map((change) => (
                <tr key={change.field}>
                  <th scope="row" className="border-b border-line p-3 align-top font-normal">{label(change)}</th>
                  <td className="border-b border-line p-3 align-top text-ink-muted tabular-nums [overflow-wrap:anywhere]">{value(change, 'oldValue')}</td>
                  <td className="border-b border-line p-3 align-top font-medium tabular-nums [overflow-wrap:anywhere]">{value(change, 'newValue')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {content.data?.note ? (
          <div className="flex flex-col gap-1 rounded-md bg-surface-muted px-4 py-3">
            <span className="text-caption text-ink-muted">{t('approvals.detail.changes.note', { name: senderName })}</span>
            <span className="[overflow-wrap:anywhere]">{content.data.note}</span>
          </div>
        ) : null}
      </div>
    </Card>
  );
}
