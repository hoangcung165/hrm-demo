// "Khôi phục mặc định": puts every role back to its default permissions after a confirm. Offered only while the
// company's permissions differ from the defaults; unsaved changes on the matrix go with it.
import { useQueryClient } from '@tanstack/react-query';
import { RotateCcw } from 'lucide-react';
import { useState, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/use-toast';
import { useRefreshAccount } from '@/features/auth/api';
import { errorMessage } from '@/features/auth/error-message';
import { ApiError } from '@/lib/api';
import { ROLE_MATRIX_KEY, useResetRolePermissions, useRoleMatrix } from '../api';

export type RoleResetButtonProps = {
  /** Gets focus after the reset, since the button itself goes away with the customization. */
  fallbackFocus: RefObject<HTMLElement | null>;
};

export function RoleResetButton({ fallbackFocus }: RoleResetButtonProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const refreshAccount = useRefreshAccount();
  const matrix = useRoleMatrix();
  const reset = useResetRolePermissions();
  const [asking, setAsking] = useState(false);
  const confirm = () =>
    reset.mutate(undefined, {
      onSuccess: () => {
        setAsking(false);
        toast({ variant: 'success', message: t('roles.reset.done'), detail: t('roles.save.doneDetail') });
        // The Admin's own roles are among them: the sidebar and the buttons follow.
        void refreshAccount().catch(() => {});
      },
      onError: (error) => {
        setAsking(false);
        toast({ variant: 'danger', message: t('roles.reset.failed'), detail: errorMessage(error, t) });
        // The permission to edit was taken away meanwhile: the page turns read-only.
        if (error instanceof ApiError && error.status === 403) {
          void queryClient.invalidateQueries({ queryKey: ROLE_MATRIX_KEY });
          void refreshAccount().catch(() => {});
        }
      },
    });

  return (
    <>
      {/* The dialog stays mounted when the button goes, so it can close and hand the focus on. */}
      {matrix.data?.customized ? (
        <Button variant="secondary" onClick={() => setAsking(true)} className="max-md:h-11">
          <RotateCcw aria-hidden="true" />
          {t('roles.reset.button')}
        </Button>
      ) : null}
      <ConfirmDialog
        open={asking}
        title={t('roles.reset.title')}
        description={t('roles.reset.text')}
        confirmLabel={t('roles.reset.confirm')}
        pending={reset.isPending}
        onConfirm={confirm}
        onCancel={() => setAsking(false)}
        fallbackFocus={fallbackFocus}
      />
    </>
  );
}
