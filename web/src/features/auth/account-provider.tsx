import type { ReactNode } from 'react';
import type { Account } from './account';
import { AccountContext } from './account-context';

// Placeholder until HRM-01/FE-3 adds sign-in: the seeded dev Admin. FE-3 replaces this with GET /api/me.
const PLACEHOLDER_ACCOUNT: Account = {
  id: '00000000-0000-0000-0000-000000000000',
  email: 'admin@hrm.local',
  name: 'admin@hrm.local',
  roles: ['ADMIN'],
};

export type AccountProviderProps = {
  /** Overrides the placeholder; tests and FE-3 pass the real Account. */
  account?: Account;
  children: ReactNode;
};

export function AccountProvider({ account = PLACEHOLDER_ACCOUNT, children }: AccountProviderProps) {
  return <AccountContext.Provider value={account}>{children}</AccountContext.Provider>;
}
