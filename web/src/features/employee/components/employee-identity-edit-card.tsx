// "Giấy tờ định danh" edited in place (`PUT …/identity`, which replaces all five fields). Opened only when the
// profile came with the full numbers, so a field never starts from a masked value.
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { EmployeeProfile } from '../api';
import { identityPart, mstOnScreen } from '../create-request';
import { IDENTITY_EDIT_PATHS } from '../edit-requests';
import { identityEditSchema } from '../schemas';
import { useProfileCardForm } from '../use-profile-card-form';
import { EmployeeEditCard } from './employee-edit-card';
import { EmployeeIdentityFields } from './employee-identity-fields';

export type EmployeeIdentityEditCardProps = { employee: EmployeeProfile };

export function EmployeeIdentityEditCard({ employee }: EmployeeIdentityEditCardProps) {
  const { t } = useTranslation();
  const schema = useMemo(() => identityEditSchema(employee.personal.dateOfBirth), [employee]);
  const card = useProfileCardForm({
    employee,
    part: 'identity',
    schema,
    toBody: identityPart,
    paths: IDENTITY_EDIT_PATHS,
    onScreen: mstOnScreen,
    first: 'idNumber',
  });
  return (
    <EmployeeEditCard title={t('employees.profile.identity.title')} saveLabel={t('employees.edit.save.identity')} card={card}>
      <EmployeeIdentityFields errorValues={card.errorValues} />
    </EmployeeEditCard>
  );
}
