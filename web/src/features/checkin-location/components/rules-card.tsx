// "Quy tắc chấm công bằng điện thoại": the company-wide rules of the mobile check-in, read only. Who may use it and the
// photo are fixed by the design; the maximum accuracy is the company setting (Sai số lớn above it).
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCompanyDateTime, formatDistance, formatNumber } from '@/lib/format';
import { useCheckinRules } from '../api';

function Rule({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-caption text-ink-muted">{label}</dt>
      <dd className="flex flex-col">
        <span className="font-medium">{value}</span>
        {note ? <span className="text-caption text-ink-muted">{note}</span> : null}
      </dd>
    </div>
  );
}

export function RulesCard() {
  const { t } = useTranslation();
  const rules = useCheckinRules();
  const data = rules.data;
  const title = t('checkinLocations.rules.title');
  if (rules.isError) {
    return (
      <Card title={title}>
        <ErrorState title={t('checkinLocations.rules.loadError')} description={t('state.errorHint')} onRetry={() => void rules.refetch()} />
      </Card>
    );
  }
  if (!data) {
    return (
      <Card busy label={title}>
        <Skeleton className="h-16 w-full" />
      </Card>
    );
  }
  const accuracyNote = data.customized
    ? t('checkinLocations.rules.accuracyChanged', { who: data.updatedByName ?? t('checkinLocations.rules.unknownPerson'), when: data.updatedAt ? formatCompanyDateTime(data.updatedAt) : '' })
    : t('checkinLocations.rules.accuracyDefault', { default: formatDistance(data.defaultMaxAccuracyMeters) });
  return (
    <Card title={title} description={t('checkinLocations.rules.intro')}>
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Rule label={t('checkinLocations.rules.who')} value={t(data.everyEmployee ? 'checkinLocations.rules.everyEmployee' : 'checkinLocations.rules.nobody')} />
        <Rule label={t('checkinLocations.rules.accuracy')} value={formatDistance(data.maxAccuracyMeters)} note={accuracyNote} />
        <Rule label={t('checkinLocations.rules.photo')} value={t(data.photoRequired ? 'checkinLocations.rules.photoRequired' : 'checkinLocations.rules.photoOptional')} note={t('checkinLocations.rules.photoNote')} />
        <Rule label={t('checkinLocations.rules.consent')} value={formatNumber(data.consentCount)} />
      </dl>
    </Card>
  );
}
