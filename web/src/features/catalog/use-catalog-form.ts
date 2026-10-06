// State of the add/edit catalog item form: values, validation, save, server errors on their fields, and the toasts.
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/components/ui/use-toast';
import { errorMessage } from '@/features/auth/error-message';
import { ApiError } from '@/lib/api';
import { useCreateCatalogItem, useUpdateCatalogItem, type CatalogItem, type CatalogKey } from './api';
import { catalogChanged, catalogFieldErrors, catalogSchema, initialValues, toRequest, type CatalogField, type CatalogValues } from './schemas';

/** What the dialog works on: a new item of the catalog, or an existing one as its list row had it. */
export type CatalogFormTarget = { catalog: CatalogKey; item: CatalogItem | null };

export type CatalogFormOutcome = {
  onSaved: (item: CatalogItem) => void;
  /** The save cannot succeed and the dialog has nothing left to do: the item is gone, or the caller lost the permission. */
  onGone: (reason: 'denied' | 'notFound') => void;
};

export function useCatalogForm({ catalog, item }: CatalogFormTarget, { onSaved, onGone }: CatalogFormOutcome) {
  const { t } = useTranslation();
  const toast = useToast();
  const create = useCreateCatalogItem(catalog);
  const update = useUpdateCatalogItem(catalog);
  const [initial] = useState(() => initialValues(item));
  // Fields validate when the user leaves them, then as they correct them; an invalid submit focuses the first invalid field.
  const form = useForm<CatalogValues>({ resolver: zodResolver(catalogSchema(catalog)), defaultValues: initial, mode: 'onTouched' });
  // Placeholder values of a server message, e.g. which holiday the dates overlap.
  const [errorValues, setErrorValues] = useState<Partial<Record<CatalogField, Record<string, string>>>>({});
  const values = useWatch({ control: form.control }) as CatalogValues;

  const submit = form.handleSubmit(async (parsed) => {
    const body = toRequest(catalog, parsed);
    try {
      if (item) {
        const saved = await update.mutateAsync({ id: item.id, body });
        toast({ variant: 'success', message: t('catalogs.form.saved', { name: saved.name }) });
        onSaved(saved);
      } else {
        const saved = await create.mutateAsync(body);
        toast({ variant: 'success', message: t('catalogs.form.added', { name: saved.name }) });
        onSaved(saved);
      }
    } catch (error) {
      const fieldErrors = catalogFieldErrors(error);
      if (fieldErrors.length > 0) {
        setErrorValues(Object.fromEntries(fieldErrors.map(({ field, values: shown }) => [field, shown ?? {}])));
        for (const { field, message } of fieldErrors) form.setError(field, { type: 'server', message });
        form.setFocus(fieldErrors[0]!.field);
        return;
      }
      const noun = t(`catalogs.one.${catalog}`);
      toast({
        variant: 'danger',
        message: item ? t('catalogs.form.saveFailed', { name: item.name }) : t('catalogs.form.addFailed', { noun }),
        detail: errorMessage(error, t),
      });
      if (error instanceof ApiError && error.status === 403) onGone('denied');
      else if (error instanceof ApiError && error.code === 'catalog.not_found') onGone('notFound');
    }
  });

  return {
    form,
    submit,
    saving: create.isPending || update.isPending,
    errorValues,
    /** Edit: nothing to save yet. */
    unchanged: item !== null && !catalogChanged(catalog, values, item),
  };
}
