// "Thêm {mục}" and "Sửa {mục}: {tên}": one form dialog for every catalog. It stays open until the save succeeds.
// Closing it with unsaved input just closes, without a confirm: the form is short and nothing was saved.
import { useId, type RefObject } from 'react';
import { FormProvider } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { useCatalogForm, type CatalogFormOutcome, type CatalogFormTarget } from '../use-catalog-form';
import { CatalogFormFields } from './catalog-form-fields';

export type CatalogDialogProps = CatalogFormOutcome & {
  target: CatalogFormTarget;
  onClose: () => void;
  fallbackFocus?: RefObject<HTMLElement | null>;
};

export function CatalogDialog({ target, onClose, onSaved, onGone, fallbackFocus }: CatalogDialogProps) {
  const { t } = useTranslation();
  const formId = useId();
  const { form, submit, saving, errorValues, unchanged } = useCatalogForm(target, { onSaved, onGone });
  const { catalog, item } = target;
  const noun = t(`catalogs.one.${catalog}`);
  const addLabel = t('catalogs.add', { noun });
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={item ? t('catalogs.form.editTitle', { noun, name: item.name }) : addLabel}
      fallbackFocus={fallbackFocus}
      busy={saving}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('dialog.cancel')}
          </Button>
          {/* While saving the button keeps its label and is disabled; an edit has nothing to save until a field changes. */}
          <Button type="submit" form={formId} disabled={saving || unchanged}>
            {item ? t('catalogs.form.save') : addLabel}
          </Button>
        </>
      }
    >
      <FormProvider {...form}>
        <form id={formId} noValidate onSubmit={submit} className="flex flex-col gap-4">
          <CatalogFormFields catalog={catalog} errorValues={errorValues} />
        </form>
      </FormProvider>
    </Dialog>
  );
}
