// "Demo as…" API. Contract: "## API contract" comment on issue #6 (section "Demo as…") and PR #109.
// Both endpoints exist only while the demo flag is on, so callers ask for them only when `me.demo.enabled` is true.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Account, Role } from '@/features/auth/account';
import { fetchAccount, SESSION_KEY } from '@/features/auth/api';
import { api, setAccessToken } from '@/lib/api';

/** Mirrors the backend record `DemoPersonasResponse.Persona`. */
export type DemoPersona = {
  /** Persona key: the name of the role it stands for. */
  persona: Role;
  fullName: string;
  title: string;
  roles: Role[];
  /** False when the persona's Account is locked or missing: it cannot be signed in as. */
  available: boolean;
};

export const PERSONAS_KEY = ['demo', 'personas'] as const;

export function usePersonas(enabled: boolean) {
  return useQuery({
    queryKey: PERSONAS_KEY,
    queryFn: async () => (await api<{ personas: DemoPersona[] }>('/api/auth/demo/personas')).personas,
    enabled,
  });
}

/**
 * Signs in as a persona: the backend ends this session and starts the persona's (same answer as login).
 * On success every cached query but the session is dropped, since it was read with the previous Account's rights.
 */
export function useDemoSignIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (persona: DemoPersona): Promise<Account> => {
      const tokens = await api<{ accessToken: string }>('/api/auth/demo/sign-in', { method: 'POST', body: { persona: persona.persona } });
      setAccessToken(tokens.accessToken);
      return fetchAccount();
    },
    onSuccess: (account) => {
      queryClient.setQueryData(SESSION_KEY, account);
      queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== SESSION_KEY[0] });
    },
  });
}
