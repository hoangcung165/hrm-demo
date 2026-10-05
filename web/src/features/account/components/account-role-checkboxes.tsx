// The roles of an Account as a required group of Checkboxes, in the order of the Role enum. At least one.
import { useController, useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Checkbox } from '@/components/ui/checkbox';
import { FormGroup } from '@/components/ui/form-group';
import { ROLES, type Role } from '@/features/auth/account';
import type { AccountValues } from '../schemas';

export type AccountRoleCheckboxesProps = {
  /** The caller edits its own Admin Account: "Admin" stays ticked and cannot be changed. */
  ownAdmin: boolean;
};

export function AccountRoleCheckboxes({ ownAdmin }: AccountRoleCheckboxesProps) {
  const { t } = useTranslation();
  const { field, fieldState } = useController<AccountValues, 'roles'>({ name: 'roles', control: useFormContext<AccountValues>().control });
  const chosen = field.value;
  const toggle = (role: Role, on: boolean) => field.onChange(on ? [...chosen, role] : chosen.filter((other) => other !== role));
  const message = fieldState.error?.message;
  const locked = (role: Role) => ownAdmin && role === 'ADMIN';
  // An invalid submit moves focus here: to the first box the user can change.
  const first = ROLES.find((role) => !locked(role));
  return (
    <FormGroup
      legend={t('accounts.form.roles')}
      required
      error={message ? t(message) : undefined}
      helper={ownAdmin ? `${t('accounts.form.ownAdminHelper')} ${t('accounts.form.rolesHelper')}` : t('accounts.form.rolesHelper')}
    >
      {/* Two columns from md up, as the form grid; 44px rows below. */}
      <div className="grid grid-cols-1 gap-x-4 md:grid-cols-2 md:gap-y-3">
        {ROLES.map((role) => (
          <Checkbox
            key={role}
            ref={role === first ? field.ref : undefined}
            name={field.name}
            checked={chosen.includes(role)}
            disabled={locked(role)}
            onChange={(event) => toggle(role, event.target.checked)}
            onBlur={field.onBlur}
            className="max-md:min-h-11"
          >
            {t(`role.${role}`)}
          </Checkbox>
        ))}
      </div>
    </FormGroup>
  );
}
