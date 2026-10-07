// Group "Thông tin cá nhân" of the create form. The emergency contact is added later on the profile.
import { useTranslation } from 'react-i18next';
import { FormGroup } from '@/components/ui/form-group';
import { EmployeePersonalFields } from './employee-personal-fields';

export function EmployeeCreatePersonal() {
  const { t } = useTranslation();
  return (
    <FormGroup legend={t('employees.profile.personal.title')}>
      <EmployeePersonalFields />
    </FormGroup>
  );
}
