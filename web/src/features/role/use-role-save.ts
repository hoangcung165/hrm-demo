// Saving the role matrix: one request for every changed role, the toast, and what a failure leaves on screen.
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/components/ui/use-toast';
import { useRefreshAccount } from '@/features/auth/api';
import { ApiError } from '@/lib/api';
import { ROLE_MATRIX_KEY, useSaveRolePermissions } from './api';
import type { RoleChange } from './use-role-draft';

/** Why the last save failed; nothing was saved in any case. */
export type RoleSaveFailure = 'network' | 'server' | 'refused';

export function useRoleSave(onSaved: () => void) {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const refreshAccount = useRefreshAccount();
  const saving = useSaveRolePermissions();
  const [failure, setFailure] = useState<RoleSaveFailure | null>(null);

  const save = async (changes: RoleChange[]) => {
    setFailure(null);
    try {
      // Only the changed roles, each with its full list; the Admin role is locked and never among them.
      await saving.mutateAsync({ roles: changes.map(({ role, permissions }) => ({ role, permissions })) });
    } catch (error) {
      // The server refuses the change itself (a locked role, a missing dependency, the permission to edit lost):
      // the matrix on screen is stale, so it is read again; without the permission the page turns read-only.
      const refused = error instanceof ApiError && (error.status === 403 || error.status === 409);
      setFailure(refused ? 'refused' : error instanceof ApiError ? 'server' : 'network');
      if (refused) {
        void queryClient.invalidateQueries({ queryKey: ROLE_MATRIX_KEY });
        void refreshAccount().catch(() => {});
      }
      return;
    }
    onSaved();
    toast({
      variant: 'success',
      message: t('roles.save.done', { count: changes.length, names: changes.map(({ role }) => t(`role.${role}`)).join(', ') }),
      detail: t('roles.save.doneDetail'),
    });
    // The Admin's own roles may be among them: the sidebar and the buttons follow.
    void refreshAccount().catch(() => {});
  };
  return { save, saving: saving.isPending, failure, clearFailure: () => setFailure(null) };
}
