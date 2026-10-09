// Asks before leaving with unsaved changes; closing or reloading the page uses the browser's own prompt.
// Used by every page that is edited in place (Thông tin công ty, the role matrix).
import { useEffect } from 'react';
import { useBlocker } from 'react-router';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

export type UnsavedChangesGuardProps = {
  when: boolean;
  /** "Rời trang và bỏ thay đổi chưa lưu?" */
  title: string;
  /** What is lost, named by page or object. */
  description: string;
  confirmLabel: string;
  /** The button that stays on the page; "Hủy" by default. */
  cancelLabel?: string;
  /**
   * Also ask when only the query string changes: for a tab kept in `?view=`, whose content and its unsaved
   * changes go away on a tab switch. Without it only another route asks.
   */
  includeSearch?: boolean;
};

export function UnsavedChangesGuard({ when, title, description, confirmLabel, cancelLabel, includeSearch = false }: UnsavedChangesGuardProps) {
  // The redirect to the login page (signed out, session expired) is never held back.
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      when &&
      nextLocation.pathname !== '/login' &&
      (nextLocation.pathname !== currentLocation.pathname || (includeSearch && nextLocation.search !== currentLocation.search)),
  );

  useEffect(() => {
    if (!when) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [when]);

  return (
    <ConfirmDialog
      open={blocker.state === 'blocked'}
      title={title}
      description={description}
      confirmLabel={confirmLabel}
      cancelLabel={cancelLabel}
      onConfirm={() => blocker.proceed?.()}
      onCancel={() => blocker.reset?.()}
    />
  );
}
