// HRM-08/FE-1 Insurance tab: read source-of-truth BHXH identity plus BHYT registration.
import { ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { DetailList } from '@/components/ui/detail-list';
import { MaskedValue } from '@/components/ui/masked-value';
import { formatDate } from '@/lib/format';
import { useEmployeeInsurance } from '../profile-records-api';
import { ProfileRecordsEmpty, ProfileRecordsState } from './profile-records-state';

export function ProfileInsuranceSection({ employeeId }: { employeeId: string }) {
  const { t } = useTranslation();
  const query = useEmployeeInsurance(employeeId);
  const [shown, setShown] = useState<'social' | 'health' | null>(null);
  const record = query.data;
  const empty = !record || !record.socialInsuranceNumber && !record.participationDate
    && !record.healthRegistrationPlace && !record.healthInsuranceNumber;
  const number = (value: string | null, field: 'social' | 'health') => (
    <MaskedValue value={value} revealable={!record?.masked} shown={shown === field}
      onToggle={() => setShown(shown === field ? null : field)}
      showLabel={t('employees.profile.records.showNumber')}
      hideLabel={t('employees.profile.records.hideNumber')}
      showText={t('employees.profile.identity.show')} hideText={t('employees.profile.identity.hide')}
      emptyText={t('employees.none')} />
  );
  return (
    <ProfileRecordsState query={query} section="insurance">
      {empty ? (
        <ProfileRecordsEmpty section="insurance" icon={<ShieldCheck />} />
      ) : record ? (
        <Card title={t('employees.profile.records.insurance.title')}
          description={t('employees.profile.records.insurance.description')}>
          <div className="grid items-start gap-6 lg:grid-cols-2">
            <DetailList items={[
              { label: t('employees.profile.records.insurance.socialNumber'),
                value: number(record.socialInsuranceNumber, 'social') },
              { label: t('employees.profile.records.insurance.participation'),
                value: record.participationDate ? <span className="tabular-nums">{formatDate(record.participationDate)}</span>
                  : <span className="text-ink-muted">{t('employees.none')}</span> },
            ]} />
            <DetailList items={[
              { label: t('employees.profile.records.insurance.healthPlace'),
                value: record.healthRegistrationPlace ?? <span className="text-ink-muted">{t('employees.none')}</span> },
              { label: t('employees.profile.records.insurance.healthNumber'),
                value: number(record.healthInsuranceNumber, 'health') },
            ]} />
          </div>
        </Card>
      ) : null}
    </ProfileRecordsState>
  );
}
