// Group "Giấy tờ định danh" of the create form. The numbers may be typed without EMPLOYEE_SENSITIVE_VIEW (the
// backend takes them, and shows them masked afterwards).
import { useTranslation } from 'react-i18next';
import { FormGroup } from '@/components/ui/form-group';
import { EmployeeIdentityFields, type EmployeeIdentityFieldsProps } from './employee-identity-fields';

export function EmployeeCreateIdentity({ errorValues }: EmployeeIdentityFieldsProps) {
  const { t } = useTranslation();
  return (
    <FormGroup legend={t('employees.profile.identity.title')}>
      <EmployeeIdentityFields errorValues={errorValues} />
    </FormGroup>
  );
}
