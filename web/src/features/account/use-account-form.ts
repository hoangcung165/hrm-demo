// State of the add/edit Account form: values, validation, save, server errors on their fields, and the toasts.
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/components/ui/use-toast';
import { useCurrentAccount } from '@/features/auth/account-context';
import { useRefreshAccount } from '@/features/auth/api';
import { errorMessage } from '@/features/auth/error-message';
import { ApiError } from '@/lib/api';
import { useCreateAccount, useUpdateAccount, type AccountRow } from './api';
import { accountAddSchema, accountChanged, accountEditSchema, accountFieldErrors, inRoleOrder, type AccountField, type AccountValues } from './schemas';

/** What the dialog works on: a new Account, or an existing one as its list row had it. */
export type AccountFormTarget = { mode: 'add' } | { mode: 'edit'; account: AccountRow };

export type AccountFormOutcome = {
  onSaved: (account: AccountRow) => void;
  /** The save cannot succeed and the dialog has nothing left to do: the Account is gone, or the caller lost the permission. */
  onGone: (reason: 'denied' | 'notFound') => void;
};

function initialValues(target: AccountFormTarget): AccountValues {
  // A new Account is an employee unless the Admin says otherwise.
  if (target.mode === 'add') return { fullName: '', email: '', password: '', roles: ['EMPLOYEE'] };
  const { account } = target;
  return { fullName: account.fullName, email: account.email, password: '', roles: inRoleOrder(account.roles) };
}

export function useAccountForm(target: AccountFormTarget, { onSaved, onGone }: AccountFormOutcome) {
  const { t } = useTranslation();
  const toast = useToast();
  const ownId = useCurrentAccount().id;
  const refreshAccount = useRefreshAccount();
  const create = useCreateAccount();
  const update = useUpdateAccount();
  const [initial] = useState(() => initialValues(target));
  // Text fields validate when the user leaves them, then as they correct them; an invalid submit focuses the first invalid field.
  const form = useForm<AccountValues>({ resolver: zodResolver(target.mode === 'add' ? accountAddSchema : accountEditSchema), defaultValues: initial, mode: 'onTouched' });
  // Placeholder values of a server message, e.g. whose Account holds the email.
  const [errorValues, setErrorValues] = useState<Partial<Record<AccountField, Record<string, string>>>>({});
  const [fullName, email, roles] = useWatch({ control: form.control, name: ['fullName', 'email', 'roles'] });

  const submit = form.handleSubmit(async (values) => {
    const body = { fullName: values.fullName, email: values.email, roles: inRoleOrder(values.roles) };
    try {
      let saved: AccountRow;
      if (target.mode === 'add') {
        saved = await create.mutateAsync({ ...body, password: values.password, employeeId: null });
        toast({ variant: 'success', message: t('accounts.form.added', { name: saved.fullName }), detail: t('accounts.form.addedDetail', { name: saved.fullName }) });
      } else {
        // The Employee cannot be changed here yet; send the current one so the save does not clear it.
        saved = await update.mutateAsync({ id: target.account.id, body: { ...body, employeeId: target.account.employee?.employeeId ?? null } });
        toast({ variant: 'success', message: t('accounts.form.saved', { name: saved.fullName }) });
        // The header shows this name, and the sidebar and this page follow these roles.
        if (saved.id === ownId) await refreshAccount().catch(() => {});
      }
      onSaved(saved);
    } catch (error) {
      const fieldErrors = accountFieldErrors(error, values);
      if (fieldErrors.length > 0) {
        setErrorValues(Object.fromEntries(fieldErrors.map(({ field, values: shown }) => [field, shown])));
        for (const { field, message } of fieldErrors) form.setError(field, { type: 'server', message });
        form.setFocus(fieldErrors[0]!.field);
        return;
      }
      const code = error instanceof ApiError ? error.code : '';
      const denied = error instanceof ApiError && error.status === 403;
      toast({
        variant: 'danger',
        message: t(target.mode === 'add' ? 'accounts.form.addFailed' : 'accounts.form.saveFailed', { name: target.mode === 'add' ? values.fullName : target.account.fullName }),
        detail: errorMessage(error, t),
      });
      if (denied) onGone('denied');
      else if (code === 'account.not_found') onGone('notFound');
    }
  });

  return {
    form,
    submit,
    saving: create.isPending || update.isPending,
    errorValues,
    /** Edit: nothing to save yet. */
    unchanged: target.mode === 'edit' && !accountChanged({ fullName, email, roles }, initial),
    /** The caller edits its own Account: it cannot drop its own Admin role. */
    ownAdmin: target.mode === 'edit' && target.account.id === ownId && target.account.roles.includes('ADMIN'),
  };
}
