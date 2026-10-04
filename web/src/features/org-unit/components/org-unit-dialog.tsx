// "Thêm đơn vị" and "Sửa {tên}": one wide form dialog. It stays open until the save succeeds.
// Closing it with unsaved input just closes, without a confirm: the form is short and nothing was saved.
import { useId, type RefObject } from 'react';
import { FormProvider } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import type { OrgUnit } from '../api';
import type { OrgNode } from '../org-tree';
import { useOrgUnitForm, type OrgUnitFormTarget } from '../use-org-unit-form';
import { OrgUnitFormFields } from './org-unit-form-fields';

export type OrgUnitDialogProps = {
  target: OrgUnitFormTarget;
  /** The company node with every unit under it. */
  root: OrgNode;
  onClose: () => void;
  /** After the tree has been refetched. */
  onSaved: (unit: OrgUnit) => void;
  fallbackFocus?: RefObject<HTMLElement | null>;
};

export function OrgUnitDialog({ target, root, onClose, onSaved, fallbackFocus }: OrgUnitDialogProps) {
  const { t } = useTranslation();
  const formId = useId();
  const { form, submit, saving, errorValues } = useOrgUnitForm(target, root, onSaved);
  const adding = target.mode === 'add';
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      size="wide"
      title={adding ? t('org.form.addTitle') : t('org.form.editTitle', { name: target.unit.name })}
      description={t(adding ? 'org.form.addText' : 'org.form.editText')}
      fallbackFocus={fallbackFocus}
      busy={saving}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('dialog.cancel')}
          </Button>
          {/* While saving the button keeps its label and is disabled. */}
          <Button type="submit" form={formId} disabled={saving}>
            {t(adding ? 'org.form.addSubmit' : 'org.form.editSubmit')}
          </Button>
        </>
      }
    >
      <FormProvider {...form}>
        <form id={formId} noValidate onSubmit={submit}>
          <OrgUnitFormFields target={target} root={root} errorValues={errorValues} />
        </form>
      </FormProvider>
    </Dialog>
  );
}
