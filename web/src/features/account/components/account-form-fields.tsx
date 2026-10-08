// Fields of the add/edit Account form, inside a FormProvider. The temporary password is asked only when adding;
// the Employee is any active Employee not linked to another Account, or none.
import { useTranslation } from 'react-i18next';
import { FormField } from '@/components/ui/form-field';
import { FormGrid } from '@/components/ui/form-grid';
import type { AccountEmployee } from '../api';
import { EMAIL_MAX, FULL_NAME_MAX, PASSWORD_MAX, type AccountField, type AccountValues } from '../schemas';
import { AccountEmployeeField } from './account-employee-field';
import { AccountRoleCheckboxes } from './account-role-checkboxes';

export type AccountFormFieldsProps = {
  adding: boolean;
  /** The caller edits its own Admin Account. */
  ownAdmin: boolean;
  /** Placeholder values of server messages, by field. */
  errorValues: Partial<Record<AccountField, Record<string, string>>>;
  /** Edit: the Employee the Account is linked to now. */
  employee?: AccountEmployee | null;
};

export function AccountFormFields({ adding, ownAdmin, errorValues, employee = null }: AccountFormFieldsProps) {
  const { t } = useTranslation();
  return (
    <>
      <FormGrid>
        <FormField<AccountValues> name="fullName" label={t('accounts.form.fullName')} required maxLength={FULL_NAME_MAX} autoComplete="off" />
        <FormField<AccountValues>
          name="email"
          type="email"
          label={t('accounts.form.email')}
          helper={t('accounts.form.emailHelper')}
          errorValues={errorValues.email}
          required
          maxLength={EMAIL_MAX}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
        />
        {adding ? (
          <FormField<AccountValues>
            name="password"
            type="password"
            // Shown while typing: the Admin hands this password over, and it is never shown again after the dialog closes.
            passwordVisible
            label={t('accounts.form.password')}
            helper={t('accounts.form.passwordHelper')}
            required
            // One more than the limit, so a password that is too long is said to be, not silently cut.
            maxLength={PASSWORD_MAX + 1}
            autoComplete="new-password"
            className="md:col-span-2"
          />
        ) : null}
        <AccountEmployeeField current={employee} errorValues={errorValues.employeeId} className="md:col-span-2" />
      </FormGrid>
      <AccountRoleCheckboxes ownAdmin={ownAdmin} />
    </>
  );
}
