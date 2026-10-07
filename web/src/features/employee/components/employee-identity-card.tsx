// Card "Giấy tờ định danh" of the profile (pattern P8): CCCD, its issue date and place, MST and số BHXH.
// When the API sends full values (EMPLOYEE_SENSITIVE_VIEW, or the caller's own profile) they still show masked,
// and "Hiện" shows one number at a time; leaving the tab masks them again. Masked values from the API have no
// "Hiện". FE-4 turns the card into a form in place (`onEdit`).
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { DetailList } from '@/components/ui/detail-list';
import { MaskedValue } from '@/components/ui/masked-value';
import { formatDate } from '@/lib/format';
import type { EmployeeIdentity } from '../api';
import { EmployeeEditButton } from './employee-edit-button';

export type EmployeeIdentityCardProps = {
  identity: EmployeeIdentity;
  /** The caller's own profile: the note speaks to them. */
  own: boolean;
  /** EMPLOYEE_EDIT and EMPLOYEE_SENSITIVE_VIEW: the "Sửa" button is shown. */
  editable: boolean;
  onEdit?: () => void;
};

const NUMBERS = ['idNumber', 'taxCode', 'socialInsuranceNumber'] as const;
type NumberField = (typeof NUMBERS)[number];

export function EmployeeIdentityCard({ identity, own, editable, onEdit }: EmployeeIdentityCardProps) {
  const { t } = useTranslation();
  const [shown, setShown] = useState<NumberField | null>(null);
  const none = <span className="text-ink-muted">{t('employees.none')}</span>;
  const number = (field: NumberField) => {
    const name = t(`employees.profile.identity.${field}`);
    return {
      label: name,
      value: (
        <MaskedValue
          value={identity[field]}
          revealable={!identity.masked}
          shown={shown === field}
          // One number at a time: showing another hides the one before.
          onToggle={() => setShown((current) => (current === field ? null : field))}
          showLabel={t(`employees.profile.identity.showLabel.${field}`)}
          hideLabel={t(`employees.profile.identity.hideLabel.${field}`)}
          showText={t('employees.profile.identity.show')}
          hideText={t('employees.profile.identity.hide')}
          emptyText={t('employees.none')}
        />
      ),
    };
  };
  const title = t('employees.profile.identity.title');
  const note = identity.masked ? 'masked' : own ? 'own' : 'full';
  return (
    <Card
      title={title}
      description={t(`employees.profile.identity.note.${note}`)}
      titleAside={editable && !identity.masked ? <EmployeeEditButton part={title.toLowerCase()} onEdit={onEdit} /> : undefined}
    >
      <DetailList
        items={[
          number('idNumber'),
          { label: t('employees.profile.identity.idIssueDate'), value: identity.idIssueDate ? <span className="tabular-nums">{formatDate(identity.idIssueDate)}</span> : none },
          { label: t('employees.profile.identity.idIssuePlace'), value: identity.idIssuePlace ?? none },
          number('taxCode'),
          number('socialInsuranceNumber'),
        ]}
      />
    </Card>
  );
}
