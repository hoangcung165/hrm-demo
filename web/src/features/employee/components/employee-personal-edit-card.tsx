// "Thông tin cá nhân" edited in place (`PUT …/personal`): the personal fields and the emergency contact.
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FormField } from '@/components/ui/form-field';
import { FormGrid } from '@/components/ui/form-grid';
import { FormGroup } from '@/components/ui/form-group';
import type { EmployeeProfile } from '../api';
import { personalPart } from '../create-request';
import { PERSONAL_EDIT_PATHS } from '../edit-requests';
import { CONTACT_NAME_MAX, personalEditSchema, RELATIONSHIP_MAX, type EmployeeFormValues } from '../schemas';
import { useProfileCardForm } from '../use-profile-card-form';
import { EmployeeEditCard } from './employee-edit-card';
import { EmployeePersonalFields } from './employee-personal-fields';

export type EmployeePersonalEditCardProps = { employee: EmployeeProfile };

export function EmployeePersonalEditCard({ employee }: EmployeePersonalEditCardProps) {
  const { t } = useTranslation();
  // The age is checked against the stored start date, and the date of birth may not follow the CCCD issue date.
  const schema = useMemo(() => personalEditSchema({ hireDate: employee.job.hireDate, idIssueDate: employee.identity.idIssueDate }), [employee]);
  const card = useProfileCardForm({ employee, part: 'personal', schema, toBody: personalPart, paths: PERSONAL_EDIT_PATHS, first: 'fullName' });
  return (
    <EmployeeEditCard title={t('employees.profile.personal.title')} saveLabel={t('employees.edit.save.personal')} card={card}>
      <EmployeePersonalFields />
      <FormGroup legend={t('employees.profile.personal.emergency')}>
        <FormGrid>
          <FormField<EmployeeFormValues> name="contactName" label={t('employees.profile.fullName')} maxLength={CONTACT_NAME_MAX} autoComplete="off" />
          <FormField<EmployeeFormValues>
            name="contactRelationship"
            label={t('employees.profile.personal.relationship')}
            placeholder={t('employees.edit.relationshipPlaceholder')}
            maxLength={RELATIONSHIP_MAX}
            autoComplete="off"
          />
          <FormField<EmployeeFormValues> name="contactPhone" type="tel" label={t('employees.profile.phone')} placeholder="0912 345 678" autoComplete="off" />
        </FormGrid>
      </FormGroup>
    </EmployeeEditCard>
  );
}
