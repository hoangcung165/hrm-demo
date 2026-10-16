import { useState, type ReactNode } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DetailList } from '@/components/ui/detail-list';
import { formatDate, formatMoney } from '@/lib/format';
import type { EmploymentContract } from '../api';
import { contractState } from '../contract-status';

export type ContractCardProps = {
  contract: EmploymentContract;
  /** The service enforces sensitive permission too; this flag only controls local presentation. */
  canRevealPay: boolean;
  actions?: ReactNode;
  children?: ReactNode;
};

export function ContractCard({ contract, canRevealPay, actions, children }: ContractCardProps) {
  const { t } = useTranslation();
  const [shown, setShown] = useState(false);
  const state = contractState(contract);
  const statusVariant = state === 'expiring' ? 'warning' : state === 'current' ? 'success' : 'neutral';
  const money = (amount: number | null) => amount === null
    ? t('employees.none')
    : <span className="tabular-nums">{shown && canRevealPay ? formatMoney(amount) : t('employees.profile.contracts.masked')}</span>;

  return (
    <Card title={contract.contractNumber}
      description={t(`employees.profile.contracts.type.${contract.contractType}`, { defaultValue: contract.contractType })}
      titleAside={<Badge variant={statusVariant}>{t(`employees.profile.contracts.state.${state}`)}</Badge>}
      actions={actions}>
      <DetailList items={[
        { label: t('employees.profile.contracts.signed'), value: formatDate(contract.signedOn) },
        { label: t('employees.profile.contracts.starts'), value: formatDate(contract.startsOn) },
        { label: t('employees.profile.contracts.ends'), value: contract.endsOn ? formatDate(contract.endsOn) : t('employees.profile.contracts.noEnd') },
        { label: t('employees.profile.contracts.salary'), value: money(contract.baseSalary) },
        { label: t('employees.profile.contracts.insuranceSalary'), value: money(contract.insuranceSalary) },
        { label: t('employees.profile.contracts.insured'), value: t(contract.insured ? 'employees.profile.contracts.yes' : 'employees.profile.contracts.no') },
        { label: t('employees.profile.contracts.tax'), value: t(`employees.profile.contracts.taxMethod.${contract.taxMethod}`, { defaultValue: contract.taxMethod }) },
      ]} />
      {children}
      {canRevealPay ? (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" aria-pressed={shown}
            aria-label={t(shown ? 'employees.profile.contracts.hide' : 'employees.profile.contracts.reveal', { number: contract.contractNumber })}
            onClick={() => setShown(value => !value)}>
            {shown ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
            {t(shown ? 'employees.profile.contracts.hideShort' : 'employees.profile.contracts.revealShort')}
          </Button>
        </div>
      ) : null}
    </Card>
  );
}
