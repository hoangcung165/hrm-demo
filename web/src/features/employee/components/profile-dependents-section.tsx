// HRM-08/FE-1 Dependents tab: tax deduction relationship and effective dates.
import { Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { DetailList } from '@/components/ui/detail-list';
import { formatDate } from '@/lib/format';
import { useEmployeeDependents } from '../profile-records-api';
import { ProfileRecordsEmpty, ProfileRecordsState } from './profile-records-state';

export function ProfileDependentsSection({ employeeId }: { employeeId: string }) {
  const { t } = useTranslation();
  const query = useEmployeeDependents(employeeId);
  const date = (value: string | null) => value ? <span className="tabular-nums">{formatDate(value)}</span>
    : <span className="text-ink-muted">{t('employees.none')}</span>;

  return (
    <ProfileRecordsState query={query} section="dependents">
      {query.data?.length === 0 ? (
        <ProfileRecordsEmpty section="dependents" icon={<Users />} />
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-2">
          {query.data?.map((dependent) => (
            <Card key={dependent.id} title={dependent.fullName}>
              <DetailList items={[
                { label: t('employees.profile.records.dependents.relationship'), value: dependent.relationship },
                { label: t('employees.profile.records.dependents.dateOfBirth'), value: date(dependent.dateOfBirth) },
                { label: t('employees.profile.records.dependents.from'), value: date(dependent.effectiveFrom) },
                { label: t('employees.profile.records.dependents.to'), value: dependent.effectiveTo
                  ? date(dependent.effectiveTo) : t('employees.profile.records.dependents.ongoing') },
              ]} />
            </Card>
          ))}
        </div>
      )}
    </ProfileRecordsState>
  );
}
