// "Tạo dự án" and "Sửa dự án": one wide form dialog, open until the save succeeds. Setting an open project to
// "Đã đóng" asks first: running allocations end today and upcoming ones are deleted.
import { useId, type RefObject } from 'react';
import { FormProvider } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Dialog } from '@/components/ui/dialog';
import type { PickedEmployee } from '@/features/employee/use-employee-picker';
import { formatDate, formatNumber } from '@/lib/format';
import type { Project } from '../api';
import { useProjectForm, type ProjectFormTarget } from '../use-project-form';
import { ProjectFormFields } from './project-form-fields';

export type ProjectDialogProps = {
  target: ProjectFormTarget;
  /** PROJECT_EDIT_ALL: any PM may be chosen. */
  freePm: boolean;
  /** The PM the form starts with (the caller when creating without PROJECT_EDIT_ALL). */
  pm: PickedEmployee | null;
  onClose: () => void;
  onSaved: (project: Project) => void;
  fallbackFocus?: RefObject<HTMLElement | null>;
};

export function ProjectDialog({ target, freePm, pm, onClose, onSaved, fallbackFocus }: ProjectDialogProps) {
  const { t } = useTranslation();
  const formId = useId();
  const { form, submit, saving, closing, confirmClose, cancelClose } = useProjectForm(target, onSaved);
  const creating = target.mode === 'create';
  const running = target.mode === 'edit' ? target.project.members.running : 0;
  const upcoming = target.mode === 'edit' ? target.project.members.upcoming : 0;
  const closeText = [
    running > 0 ? t('projects.form.closeRunning', { count: running, number: formatNumber(running), date: formatDate(new Date()) }) : t('projects.form.closeNoneRunning'),
    upcoming > 0 ? t('projects.form.closeUpcoming', { count: upcoming, number: formatNumber(upcoming) }) : '',
    running + upcoming > 0 ? t('projects.form.closeReopen') : '',
  ].filter(Boolean).join(' ');
  return (
    <>
      <Dialog
        open={!closing}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
        size="wide"
        title={creating ? t('projects.form.createTitle') : t('projects.form.editTitle')}
        description={creating ? t('projects.form.createText') : target.project.name}
        fallbackFocus={fallbackFocus}
        busy={saving}
        footer={
          <>
            <Button variant="secondary" onClick={onClose}>
              {t('dialog.cancel')}
            </Button>
            <Button type="submit" form={formId} disabled={saving}>
              {t(creating ? 'projects.form.createSubmit' : 'projects.form.editSubmit')}
            </Button>
          </>
        }
      >
        <FormProvider {...form}>
          <form id={formId} noValidate onSubmit={submit}>
            <ProjectFormFields target={target} freePm={freePm} pm={pm} />
          </form>
        </FormProvider>
      </Dialog>
      {target.mode === 'edit' ? (
        <ConfirmDialog
          open={Boolean(closing)}
          title={t('projects.form.closeTitle', { name: target.project.name })}
          description={closeText}
          confirmLabel={t('projects.form.closeConfirm')}
          pending={saving}
          onConfirm={() => void confirmClose()}
          onCancel={cancelClose}
        />
      ) : null}
    </>
  );
}
