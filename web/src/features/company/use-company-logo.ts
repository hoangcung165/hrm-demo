// State of the logo block: client-side check, upload, removal behind a confirm, and their toasts.
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/components/ui/use-toast';
import { ApiError } from '@/lib/api';
import { useRemoveCompanyLogo, useUploadCompanyLogo } from './api';
import { failureHint, logoErrorMessage } from './error-message';
import { logoRejection } from './logo-rules';

export function useCompanyLogo() {
  const { t } = useTranslation();
  const toast = useToast();
  const upload = useUploadCompanyLogo();
  const remove = useRemoveCompanyLogo();
  const [rejected, setRejected] = useState<{ code: string | null; file: File } | null>(null);
  const [confirmingRemove, setConfirmingRemove] = useState(false);

  const select = (file: File) => {
    const code = logoRejection(file);
    if (code) {
      setRejected({ code, file });
      return;
    }
    setRejected(null);
    upload.mutate(file, {
      onSuccess: () => toast({ variant: 'success', message: t('company.logo.updated') }),
      onError: (error) => setRejected({ code: error instanceof ApiError ? error.code : null, file }),
    });
  };

  const confirmRemove = () =>
    remove.mutate(undefined, {
      onSuccess: () => {
        setRejected(null);
        toast({ variant: 'success', message: t('company.logo.removed') });
      },
      onError: (error) => toast({ variant: 'danger', message: t('company.logo.removeFailed'), detail: failureHint(error, t) }),
      onSettled: () => setConfirmingRemove(false),
    });

  return {
    select,
    uploading: upload.isPending,
    /** Translated at render so it follows a language switch. */
    error: rejected ? logoErrorMessage(rejected.code, rejected.file, t) : undefined,
    confirmingRemove,
    removing: remove.isPending,
    askRemove: () => setConfirmingRemove(true),
    cancelRemove: () => setConfirmingRemove(false),
    confirmRemove,
  };
}
