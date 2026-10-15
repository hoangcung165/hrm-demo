import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { DetailList } from '@/components/ui/detail-list';
import { MaskedValue } from '@/components/ui/masked-value';
import { formatDate, formatMoney } from '@/lib/format';
import type { EmploymentContract } from '../api';
import { contractState } from '../contract-status';

export type ContractCardProps = {
  contract: EmploymentContract;
  /** The service enforces sensitive permission too; this flag only controls local presentation. */
  canRevealPay: boolean;
};

export function ContractCard({ contract, canRevealPay }: ContractCardProps) {
  const { t } = useTranslation();
  const [shown, setShown] = useState(false);
  const state = contractState(contract);
  const statusVariant = state === 'expiring' ? 'warning' : state === 'current' ? 'success' : 'neutral';
  const money = (amount: number | null) => amount === null ? t('employees.none') : (
    <MaskedValue value={formatMoney(amount)} revealable={canRevealPay} shown={shown}
      onToggle={() => setShown(value => !value)}
      showLabel={t('employees.profile.contracts.reveal', { number: contract.contractNumber })}
      hideLabel={t('employees.profile.contracts.hide', { number: contract.contractNumber })}
      showText={t('employees.profile.identity.show')} hideText={t('employees.profile.identity.hide')}
      emptyText={t('employees.none')} />
  );

  return (
    <Card title={contract.contractNumber}
      description={t(`employees.profile.contracts.type.${contract.contractType}`, { defaultValue: contract.contractType })}
      titleAside={<Badge variant={statusVariant}>{t(`employees.profile.contracts.state.${state}`)}</Badge>}>
      <DetailList items={[
        { label: t('employees.profile.contracts.signed'), value: formatDate(contract.signedOn) },
        { label: t('employees.profile.contracts.starts'), value: formatDate(contract.startsOn) },
        { label: t('employees.profile.contracts.ends'), value: contract.endsOn ? formatDate(contract.endsOn) : t('employees.profile.contracts.noEnd') },
        { label: t('employees.profile.contracts.salary'), value: money(contract.baseSalary) },
        { label: t('employees.profile.contracts.insuranceSalary'), value: money(contract.insuranceSalary) },
        { label: t('employees.profile.contracts.insured'), value: t(contract.insured ? 'employees.profile.contracts.yes' : 'employees.profile.contracts.no') },
        { label: t('employees.profile.contracts.tax'), value: t(`employees.profile.contracts.taxMethod.${contract.taxMethod}`, { defaultValue: contract.taxMethod }) },
      ]} />
    </Card>
  );
}
