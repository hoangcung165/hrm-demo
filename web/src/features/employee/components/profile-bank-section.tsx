// HRM-08/FE-1 Bank tab: read-only accounts, salary default, and safe account-number disclosure.
import { Landmark } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { DetailList } from '@/components/ui/detail-list';
import { MaskedValue } from '@/components/ui/masked-value';
import { useEmployeeBanks } from '../profile-records-api';
import { ProfileRecordsEmpty, ProfileRecordsState } from './profile-records-state';

export function ProfileBankSection({ employeeId }: { employeeId: string }) {
  const { t } = useTranslation();
  const query = useEmployeeBanks(employeeId);
  const [revealedId, setRevealedId] = useState<string | null>(null);
  return (
    <ProfileRecordsState query={query} section="bank">
      {query.data?.length === 0 ? (
        <ProfileRecordsEmpty section="bank" icon={<Landmark />} />
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-2">
          {query.data?.map((bank) => (
            <Card key={bank.id} title={bank.bankName}
              titleAside={bank.defaultAccount ? (
                <span className="rounded-sm bg-brand-teal-soft px-2 py-1 text-caption font-medium text-success">
                  {t('employees.profile.records.bank.default')}
                </span>
              ) : undefined}>
              <DetailList items={[
                { label: t('employees.profile.records.bank.holder'), value: bank.accountHolder },
                { label: t('employees.profile.records.bank.number'), value: (
                  <MaskedValue value={bank.accountNumber} revealable={!bank.masked}
                    shown={revealedId === bank.id} onToggle={() => setRevealedId(revealedId === bank.id ? null : bank.id)}
                    showLabel={t('employees.profile.records.showNumber')}
                    hideLabel={t('employees.profile.records.hideNumber')}
                    showText={t('employees.profile.identity.show')} hideText={t('employees.profile.identity.hide')}
                    emptyText={t('employees.none')} />
                ) },
              ]} />
            </Card>
          ))}
        </div>
      )}
    </ProfileRecordsState>
  );
}
