// Asks before leaving the route with unsaved changes; closing the tab uses the browser's own prompt.
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useBlocker } from 'react-router';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

export type UnsavedChangesGuardProps = { when: boolean };

export function UnsavedChangesGuard({ when }: UnsavedChangesGuardProps) {
  const { t } = useTranslation();
  // The redirect to the login page (signed out, session expired) is never held back.
  const blocker = useBlocker(({ currentLocation, nextLocation }) => when && nextLocation.pathname !== currentLocation.pathname && nextLocation.pathname !== '/login');

  useEffect(() => {
    if (!when) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [when]);

  return (
    <ConfirmDialog
      open={blocker.state === 'blocked'}
      title={t('company.leave.title')}
      description={t('company.leave.text')}
      confirmLabel={t('company.leave.confirm')}
      onConfirm={() => blocker.proceed?.()}
      onCancel={() => blocker.reset?.()}
    />
  );
}
