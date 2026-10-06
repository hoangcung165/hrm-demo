// Lock, unlock and set a temporary password: the calls, their toasts and what a failure means for the page.
import { useTranslation } from 'react-i18next';
import { useToast } from '@/components/ui/use-toast';
import { errorMessage } from '@/features/auth/error-message';
import { ApiError } from '@/lib/api';
import { useLockAccount, useSetAccountPassword, useUnlockAccount, type AccountRow } from './api';

export type AccountStatusOutcome = {
  /** The action cannot succeed and nothing is left to do: the Account is gone, or the caller lost the permission. */
  onGone: (reason: 'denied' | 'notFound') => void;
};

type Action = 'lock' | 'unlock' | 'password';

export function useAccountStatus({ onGone }: AccountStatusOutcome) {
  const { t } = useTranslation();
  const toast = useToast();
  const locking = useLockAccount();
  const unlocking = useUnlockAccount();
  const passwording = useSetAccountPassword();

  /** Runs one action and says how it went. Resolves to whether it succeeded; `rethrow` lets a form place the error itself. */
  const run = async (action: Action, account: AccountRow, call: () => Promise<unknown>, rethrow: (error: unknown) => boolean = () => false) => {
    const name = account.fullName;
    try {
      await call();
      toast({ variant: 'success', message: t(`accounts.${action}.done`, { name }), detail: action === 'password' ? t('accounts.password.doneDetail', { name }) : undefined });
      return true;
    } catch (error) {
      if (rethrow(error)) throw error;
      // The row keeps the status it had: the list was reloaded, and nothing here changed it.
      toast({ variant: 'danger', message: t(`accounts.${action}.failed`, { name }), detail: errorMessage(error, t) });
      if (error instanceof ApiError && error.status === 403) onGone('denied');
      else if (error instanceof ApiError && error.code === 'account.not_found') onGone('notFound');
      return false;
    }
  };

  return {
    lock: (account: AccountRow) => run('lock', account, () => locking.mutateAsync(account.id)),
    unlock: (account: AccountRow) => run('unlock', account, () => unlocking.mutateAsync(account.id)),
    /** A `validation.invalid` answer is thrown back to the dialog, which shows it under the field. */
    setPassword: (account: AccountRow, password: string) =>
      run('password', account, () => passwording.mutateAsync({ id: account.id, password }), (error) => error instanceof ApiError && error.code === 'validation.invalid'),
    locking: locking.isPending,
    /** An unlock runs without a dialog: its menu item waits for it. */
    unlocking: unlocking.isPending,
    settingPassword: passwording.isPending,
  };
}
