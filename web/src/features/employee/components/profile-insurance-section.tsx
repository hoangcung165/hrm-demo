// HRM-08/FE-2B: show insurance values read-only and offer a scoped editor to authorized HR.
import { Pencil, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DetailList } from '@/components/ui/detail-list';
import { MaskedValue } from '@/components/ui/masked-value';
import { useToast } from '@/components/ui/use-toast';
import { formatDate } from '@/lib/format';
import { useEmployeeInsurance, profileRecordsKey } from '../profile-records-api';
import { saveEmployeeInsurance, type InsuranceWrite } from '../profile-insurance-write';
import { ProfileInsuranceFormDialog } from './profile-insurance-form-dialog';
import { ProfileRecordsEmpty, ProfileRecordsState } from './profile-records-state';

export function ProfileInsuranceSection({ employeeId, canEdit = false, onDirtyChange = () => {} }: {
  employeeId: string; canEdit?: boolean; onDirtyChange?: (dirty: boolean) => void;
}) {
  const { t } = useTranslation();
  const query = useEmployeeInsurance(employeeId);
  const cache = useQueryClient();
  const toast = useToast();
  const [shown, setShown] = useState<'social' | 'health' | null>(null);
  const [editing, setEditing] = useState(false);
  const record = query.data;
  const empty = !record || (!record.socialInsuranceNumber && !record.participationDate
    && !record.healthRegistrationPlace && !record.healthInsuranceNumber);

  const number = (value: string | null, field: 'social' | 'health') => (
    <MaskedValue value={value} revealable={!record?.masked} shown={shown === field}
      onToggle={() => setShown(current => current === field ? null : field)}
      showLabel={t('employees.profile.records.showNumber')}
      hideLabel={t('employees.profile.records.hideNumber')}
      showText={t('employees.profile.identity.show')} hideText={t('employees.profile.identity.hide')}
      emptyText={t('employees.none')} />
  );

  const save = async (body: InsuranceWrite) => {
    await saveEmployeeInsurance(employeeId, body);
    setShown(null);
    await cache.invalidateQueries({ queryKey: profileRecordsKey(employeeId, 'insurance') });
    toast({ variant: 'success', message: t('employees.profile.records.insuranceEdit.saved') });
  };
  const addOrEdit = canEdit && record && !record.masked ? (
    <Button variant="secondary" size="sm" onClick={() => { setShown(null); setEditing(true); }}
      className="max-md:h-11" aria-label={t('employees.profile.records.insuranceEdit.editLabel')}>
      <Pencil aria-hidden="true" />{t('employees.profile.edit')}
    </Button>
  ) : null;

  return (
    <ProfileRecordsState query={query} section="insurance">
      <div className="flex flex-col gap-4">
        {empty ? (
          <>
            {canEdit && record && !record.masked ? (
              <div className="flex justify-end">
                <Button onClick={() => { setShown(null); setEditing(true); }}>
                  {t('employees.profile.records.insuranceEdit.add')}
                </Button>
              </div>
            ) : null}
            <ProfileRecordsEmpty section="insurance" icon={<ShieldCheck />} />
          </>
        ) : record ? (
          <Card title={t('employees.profile.records.insurance.title')}
            titleAside={addOrEdit}
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
        {editing && record && canEdit && !record.masked ? (
          <ProfileInsuranceFormDialog record={record} onSave={save} onDirty={onDirtyChange}
            onClose={() => { onDirtyChange(false); setEditing(false); }} />
        ) : null}
      </div>
    </ProfileRecordsState>
  );
}
