import { createContext, useContext } from 'react';
import type { Account } from './account';

export const AccountContext = createContext<Account | null>(null);

/** The signed-in Account. Throws outside an AccountProvider so a missing provider fails loudly. */
export function useCurrentAccount(): Account {
  const account = useContext(AccountContext);
  if (!account) throw new Error('useCurrentAccount must be used inside <AccountProvider>');
  return account;
}
