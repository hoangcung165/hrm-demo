// The fields of "Thông tin cá nhân": name, date of birth, gender, phone, email, address. Shared by "Thêm nhân
// viên" and the card edited in place.
import { useTranslation } from 'react-i18next';
import { FormField } from '@/components/ui/form-field';
import { FormGrid } from '@/components/ui/form-grid';
import { ADDRESS_MAX, EMAIL_MAX, FULL_NAME_MAX, type EmployeeFormValues } from '../schemas';
import { EmployeeGenderField } from './employee-gender-field';

export function EmployeePersonalFields() {
  const { t } = useTranslation();
  return (
    <FormGrid>
      <FormField<EmployeeFormValues> name="fullName" label={t('employees.profile.fullName')} required maxLength={FULL_NAME_MAX} autoComplete="off" className="md:col-span-2" />
      <FormField<EmployeeFormValues> name="dateOfBirth" type="date" label={t('employees.profile.personal.dateOfBirth')} required min="1900-01-02" />
      <EmployeeGenderField />
      <FormField<EmployeeFormValues> name="phone" type="tel" label={t('employees.profile.phone')} placeholder="0912 345 678" autoComplete="off" />
      <FormField<EmployeeFormValues> name="personalEmail" type="email" label={t('employees.profile.email')} maxLength={EMAIL_MAX} autoComplete="off" autoCapitalize="none" spellCheck={false} />
      <FormField<EmployeeFormValues> name="address" label={t('employees.profile.personal.address')} maxLength={ADDRESS_MAX} autoComplete="off" className="md:col-span-2" />
    </FormGrid>
  );
}
