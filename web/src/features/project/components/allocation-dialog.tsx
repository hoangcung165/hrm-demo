// "Phân bổ nhân sự" and "Sửa phân bổ": one wide dialog with the live check under the fields. An overload warns and
// still saves: the submit button then reads "Vẫn lưu khi quá tải".
import { useId, type RefObject } from 'react';
import { FormProvider, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import type { Allocation, Project } from '../api';
import type { AllocationSaveResponse } from '../allocation-api';
import { useAllocationCheck } from '../use-allocation-check';
import { useAllocationForm, type AllocationTarget } from '../use-allocation-form';
import type { AllocationFormValues } from '../allocation-schemas';
import { AllocationCheck } from './allocation-check';
import { AllocationFormFields } from './allocation-form-fields';

export type AllocationDialogProps = {
  project: Project;
  target: AllocationTarget;
  onClose: () => void;
  onSaved: (saved: AllocationSaveResponse) => void;
  onEditAgain: (allocation: Allocation) => void;
  fallbackFocus?: RefObject<HTMLElement | null>;
};

export function AllocationDialog({ project, target, onClose, onSaved, onEditAgain, fallbackFocus }: AllocationDialogProps) {
  const { t } = useTranslation();
  const formId = useId();
  const { form, submit, saving, editing, range } = useAllocationForm({ project, target, onSaved, onEditAgain });
  const values = useWatch({ control: form.control }) as AllocationFormValues;
  const check = useAllocationCheck(project.id, target.mode === 'edit' ? target.allocation.id : null, values, range);
  const overloaded = check.status === 'ready' && check.result.overloaded;
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      size="wide"
      title={t(editing ? 'projects.allocate.editTitle' : 'projects.allocate.addTitle')}
      description={target.mode === 'edit' ? `${target.allocation.employee?.fullName ?? ''} · ${project.name}` : t('projects.allocate.addText', { name: project.name })}
      fallbackFocus={fallbackFocus}
      busy={saving}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('dialog.cancel')}
          </Button>
          <Button type="submit" form={formId} variant={overloaded ? 'danger' : 'primary'} disabled={saving}>
            {t(overloaded ? 'projects.allocate.saveOver' : editing ? 'projects.form.editSubmit' : 'projects.allocate.submit')}
          </Button>
        </>
      }
    >
      <FormProvider {...form}>
        <form id={formId} noValidate onSubmit={submit}>
          <AllocationFormFields project={project} editing={target.mode === 'edit' ? target.allocation : undefined} />
        </form>
      </FormProvider>
      <AllocationCheck state={check} />
    </Dialog>
  );
}
