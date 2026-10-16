// The drawer a record opens: who changed what and when, and the values before → after. Non-modal: the list stays
// usable. Read only, like the whole Audit log: there is nothing to edit or delete here.
import { useTranslation } from 'react-i18next';
import { DetailList } from '@/components/ui/detail-list';
import { Drawer } from '@/components/ui/drawer';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateTime } from '@/lib/format';
import { useAuditLog, type AuditLogListItem } from '../api';
import { useAuditLabels } from '../use-audit-labels';
import { AuditActionBadge } from './audit-action-badge';
import { AuditChangesTable } from './audit-changes-table';

export type AuditRecordDrawerProps = {
  /** The row that is open, shown at once while the values load; `null` closes the drawer. */
  row: AuditLogListItem | null;
  onClose: () => void;
  /** Gets focus when the row that opened the drawer is gone (another page, another filter). */
  fallbackFocus?: () => HTMLElement | null;
};

export function AuditRecordDrawer({ row, onClose, fallbackFocus }: AuditRecordDrawerProps) {
  const { t } = useTranslation();
  const labels = useAuditLabels();
  const record = useAuditLog(row?.id ?? '');
  const person = row ? labels.actor(row.actorName, row.actorId) : '';

  return (
    <Drawer
      open={row !== null}
      onClose={onClose}
      caption={t('audit.record.caption')}
      title={row?.summary ?? ''}
      subtitle={row ? `${formatDateTime(row.occurredAt)} · ${person}` : undefined}
      fallbackFocus={fallbackFocus}
    >
      {row ? (
        <div className="flex flex-col gap-6">
          <DetailList
            items={[
              { label: t('audit.col.object'), value: labels.entityType(row.entityType, row.entityLabel) },
              { label: t('audit.col.action'), value: <AuditActionBadge action={row.action} /> },
              { label: t('audit.col.person'), value: person },
              { label: t('audit.col.time'), value: <time dateTime={row.occurredAt} className="tabular-nums">{formatDateTime(row.occurredAt)}</time> },
            ]}
          />
          <section aria-labelledby="audit-changes-heading" className="flex flex-col gap-2">
            <h3 id="audit-changes-heading" className="text-body-strong">
              {t('audit.record.changes')}
            </h3>
            {record.isError ? (
              <ErrorState title={t('audit.record.loadError')} onRetry={() => void record.refetch()} />
            ) : !record.data ? (
              <div role="status" aria-label={t('audit.record.loading')} className="flex flex-col gap-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : (
              <AuditChangesTable record={record.data} />
            )}
          </section>
          <p className="text-caption text-ink-muted">{t('audit.record.readOnly')}</p>
        </div>
      ) : null}
    </Drawer>
  );
}
