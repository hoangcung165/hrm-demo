// Group "Thông tin cá nhân" of the create form. The emergency contact is added later on the profile.
import { useTranslation } from 'react-i18next';
import { FormField } from '@/components/ui/form-field';
import { FormGrid } from '@/components/ui/form-grid';
import { FormGroup } from '@/components/ui/form-group';
import { ADDRESS_MAX, EMAIL_MAX, FULL_NAME_MAX, type EmployeeCreateValues } from '../schemas';
import { EmployeeGenderField } from './employee-gender-field';

export function EmployeeCreatePersonal() {
  const { t } = useTranslation();
  return (
    <FormGroup legend={t('employees.profile.personal.title')}>
      <FormGrid>
        <FormField<EmployeeCreateValues> name="fullName" label={t('employees.profile.fullName')} required maxLength={FULL_NAME_MAX} autoComplete="off" className="md:col-span-2" />
        <FormField<EmployeeCreateValues> name="dateOfBirth" type="date" label={t('employees.profile.personal.dateOfBirth')} required min="1900-01-02" />
        <EmployeeGenderField />
        <FormField<EmployeeCreateValues> name="phone" type="tel" label={t('employees.profile.phone')} placeholder="0912 345 678" autoComplete="off" />
        <FormField<EmployeeCreateValues> name="personalEmail" type="email" label={t('employees.profile.email')} maxLength={EMAIL_MAX} autoComplete="off" autoCapitalize="none" spellCheck={false} />
        <FormField<EmployeeCreateValues> name="address" label={t('employees.profile.personal.address')} maxLength={ADDRESS_MAX} autoComplete="off" className="md:col-span-2" />
      </FormGrid>
    </FormGroup>
  );
}
