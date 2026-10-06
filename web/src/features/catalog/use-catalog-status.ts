// Deactivate (with "Hoàn tác"), reactivate and delete a catalog item: the calls, their toasts and what a failure
// means for the page. Every call reloads the list, so a row shows what the server holds whatever happened.
import { useTranslation } from 'react-i18next';
import { useToast } from '@/components/ui/use-toast';
import { errorMessage } from '@/features/auth/error-message';
import { ApiError } from '@/lib/api';
import { useDeactivateCatalogItem, useDeleteCatalogItem, useReactivateCatalogItem, type CatalogItem, type CatalogItemRef, type CatalogKey } from './api';

export type CatalogStatusOutcome = {
  /** The caller lost `CATALOG_EDIT` meanwhile. */
  onDenied: () => void;
};

type Action = 'deactivate' | 'reactivate' | 'delete';

export function useCatalogStatus(catalog: CatalogKey, { onDenied }: CatalogStatusOutcome) {
  const { t } = useTranslation();
  const toast = useToast();
  const deactivating = useDeactivateCatalogItem();
  const reactivating = useReactivateCatalogItem();
  const deleting = useDeleteCatalogItem();
  const calls: Record<Action, (ref: CatalogItemRef) => Promise<unknown>> = {
    deactivate: (ref) => deactivating.mutateAsync(ref),
    reactivate: (ref) => reactivating.mutateAsync(ref),
    delete: (ref) => deleting.mutateAsync(ref),
  };

  /** Runs one action and says how it went; resolves to whether it succeeded. An undo runs in the catalog of its item. */
  const run = async (action: Action, item: CatalogItem): Promise<boolean> => {
    const name = item.name;
    try {
      await calls[action]({ catalog, id: item.id });
    } catch (error) {
      const inUse = error instanceof ApiError && error.code === 'catalog.item_in_use';
      // It came into use since the list was loaded: the list reloads, and the row offers no delete any more.
      toast({ variant: 'danger', message: t(`catalogs.${action}.failed`, { name }), detail: inUse ? t('catalogs.delete.inUse') : errorMessage(error, t) });
      if (error instanceof ApiError && error.status === 403) onDenied();
      return false;
    }
    toast({
      variant: 'success',
      message: t(`catalogs.${action}.done`, { name }),
      ...(action === 'deactivate'
        ? { detail: t('catalogs.deactivate.doneDetail'), action: { label: t('catalogs.deactivate.undo'), onClick: () => void run('reactivate', item) } }
        : {}),
    });
    return true;
  };

  return {
    deactivate: (item: CatalogItem) => run('deactivate', item),
    reactivate: (item: CatalogItem) => run('reactivate', item),
    remove: (item: CatalogItem) => run('delete', item),
    deleting: deleting.isPending,
  };
}
