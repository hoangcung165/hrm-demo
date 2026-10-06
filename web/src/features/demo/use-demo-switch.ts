// "Demo as…": the persona list, the active persona and the switch with its toasts and navigation.
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { useToast } from '@/components/ui/use-toast';
import { useCurrentAccount } from '@/features/auth/account-context';
import { errorMessage } from '@/features/auth/error-message';
import { ApiError } from '@/lib/api';
import { PERSONAS_KEY, useDemoSignIn, usePersonas, type DemoPersona } from './api';

export function useDemoSwitch() {
  const { t } = useTranslation();
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const account = useCurrentAccount();
  const enabled = account.demo.enabled;
  const personas = usePersonas(enabled);
  const signIn = useDemoSignIn();
  const activeKey = account.demo.persona;
  const active = personas.data?.find((persona) => persona.persona === activeKey) ?? null;

  /** Signs in as `persona`; `onSwitched` runs after the switch went through. */
  const switchTo = (persona: DemoPersona, onSwitched?: () => void) => {
    if (persona.persona === activeKey || signIn.isPending) return;
    signIn.mutate(persona, {
      onSuccess: () => {
        // The current page may be denied to the new persona: start from the overview.
        navigate('/');
        const roles = persona.roles.map((role) => t(`role.${role}`)).join(', ');
        toast({ variant: 'success', message: t('demo.switched', { name: persona.fullName, roles }) });
        onSwitched?.();
      },
      onError: (error) => {
        toast({ variant: 'danger', message: t('demo.failed', { name: persona.fullName }), detail: errorMessage(error, t) });
        // Someone locked the persona since the list was read: show it as it is now.
        if (error instanceof ApiError && error.code === 'demo.persona_unavailable') {
          void queryClient.invalidateQueries({ queryKey: PERSONAS_KEY });
        }
      },
    });
  };

  return {
    enabled,
    personas,
    activeKey,
    /** The active persona, once the list has arrived; null for a normal Account. */
    active,
    switching: signIn.isPending,
    switchTo,
    /** Reads the list again when the menu opens, so a persona locked meanwhile shows as unavailable. */
    refresh: () => void personas.refetch(),
  };
}
