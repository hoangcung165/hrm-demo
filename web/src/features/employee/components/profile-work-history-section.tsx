import { CalendarDays } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { formatDate } from '@/lib/format';
import type { EmployeeProfile } from '../api';
import { useEmployeeWorkHistory, type WorkHistoryItem } from '../profile-work-history-api';
import { ProfileRecordsState } from './profile-records-state';
import { WorkHistoryActions } from './work-history-actions';

export function ProfileWorkHistorySection({ employee, canEdit, canReadSensitive, onDirty }: {
  employee: EmployeeProfile; canEdit: boolean; canReadSensitive: boolean; onDirty: (dirty: boolean) => void;
}) {
  const { t } = useTranslation();
  const query = useEmployeeWorkHistory(employee.id);
  return (
    <section className="flex flex-col gap-4" aria-label={t('employees.profile.tab.history')}>
      <h2 className="text-heading">{t('employees.profile.tab.history')}</h2>
      <WorkHistoryActions employee={employee} canEdit={canEdit} canReadSensitive={canReadSensitive} onDirty={onDirty} />
      <ProfileRecordsState query={query} section="history">
        {query.data?.length ? (
          <Card title={t('employees.profile.history.title')} description={t('employees.profile.history.description')}>
            <ol className="relative ml-2 border-l border-line pl-6" aria-label={t('employees.profile.history.list')}>
              {query.data.map((item, index) => <Milestone key={item.sourceId ?? `hire-${index}`} item={item} />)}
            </ol>
            {query.data.length === 1 && query.data[0].kind === 'HIRE' ? (
              <p className="text-body-small text-ink-muted">{t('employees.profile.history.onlyHire')}</p>
            ) : null}
          </Card>
        ) : query.data ? (
          <Card bare><EmptyState icon={<CalendarDays aria-hidden="true" />} title={t('employees.profile.history.emptyTitle')}
            description={t('employees.profile.history.emptyText')} /></Card>
        ) : null}
      </ProfileRecordsState>
    </section>
  );
}

function Milestone({ item }: { item: WorkHistoryItem }) {
  const { t } = useTranslation();
  return (
    <li className="relative pb-6 last:pb-0">
      <span aria-hidden="true" className="absolute -left-[31px] top-1 size-3 rounded-full border-2 border-brand-blue bg-surface" />
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="text-body-strong">{t(`employees.profile.history.kind.${item.kind}`)}</h3>
        <time dateTime={item.effectiveOn} className="whitespace-nowrap text-body-small font-medium text-ink-muted">
          {t('employees.profile.history.effectiveOn', { date: formatDate(item.effectiveOn) })}
        </time>
      </div>
      {item.kind !== 'HIRE' && item.kind !== 'PROBATION_PASS' && item.kind !== 'PROBATION_FAIL' && item.kind !== 'PROBATION_EXTEND' ? (
        <p className="mt-1 whitespace-pre-wrap break-words text-body-small">{item.description}</p>
      ) : null}
      <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-caption text-ink-muted">
        {item.decisionNumber ? <div className="flex gap-1"><dt>{t('employees.profile.history.decision')}:</dt><dd className="break-all">{item.decisionNumber}</dd></div> : null}
        {item.signedOn ? <div className="flex gap-1"><dt>{t('employees.profile.history.signedOn')}:</dt><dd>{formatDate(item.signedOn)}</dd></div> : null}
        <div className="flex gap-1"><dt>{t('employees.profile.history.source')}:</dt>
          <dd>{t(`employees.profile.history.sourceKind.${item.kind === 'HIRE' ? 'HIRE' : item.kind.startsWith('PROBATION_') ? 'PROBATION' : item.kind === 'RESIGNATION' ? 'RESIGNATION' : 'DECISION'}`)}</dd></div>
        {item.actorId ? <div className="flex gap-1"><dt>{t('employees.profile.history.actor')}:</dt><dd className="break-all">{item.actorId}</dd></div> : null}
      </dl>
    </li>
  );
}
