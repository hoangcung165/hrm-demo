// State of the create/edit project form: values, validation, save, server errors on their fields, and the toasts.
// Changing the status to "Đã đóng" asks first (`closing`); the save then runs from the confirm dialog.
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/components/ui/use-toast';
import { ApiError } from '@/lib/api';
import { useCreateProject, useUpdateProject, type Project, type ProjectUpdateRequest } from './api';
import { parseBudget, projectFieldErrors, projectSchema, type ProjectFormValues } from './schemas';

/** A new project with the caller as PM (empty when they may name anyone), or an existing one. */
export type ProjectFormTarget = { mode: 'create'; pmEmployeeId: string } | { mode: 'edit'; project: Project };

const budgetText = (value: number | null) => (value === null ? '' : new Intl.NumberFormat('vi-VN').format(value));

function initialValues(target: ProjectFormTarget): ProjectFormValues {
  if (target.mode === 'create') {
    return { code: '', name: '', client: '', pmEmployeeId: target.pmEmployeeId, orgUnitId: '', startDate: '', endDate: '', status: 'PLANNED', laborBudget: '' };
  }
  const p = target.project;
  return {
    code: p.code,
    name: p.name,
    client: p.client ?? '',
    pmEmployeeId: p.pm?.id ?? '',
    orgUnitId: p.orgUnit?.id ?? '',
    startDate: p.startDate,
    endDate: p.endDate,
    status: p.status,
    laborBudget: budgetText(p.laborBudget),
  };
}

export function useProjectForm(target: ProjectFormTarget, onSaved: (project: Project) => void) {
  const { t } = useTranslation();
  const toast = useToast();
  const create = useCreateProject();
  const update = useUpdateProject();
  const form = useForm<ProjectFormValues>({ resolver: zodResolver(projectSchema), defaultValues: initialValues(target), mode: 'onTouched' });
  /** The checked values waiting for "Đóng dự án" in the confirm dialog. */
  const [closing, setClosing] = useState<ProjectFormValues | null>(null);

  const save = async (values: ProjectFormValues) => {
    const body: ProjectUpdateRequest = {
      name: values.name,
      client: values.client || null,
      pmEmployeeId: values.pmEmployeeId,
      orgUnitId: values.orgUnitId,
      startDate: values.startDate,
      endDate: values.endDate,
      status: values.status,
      laborBudget: parseBudget(values.laborBudget),
    };
    try {
      let saved: Project;
      if (target.mode === 'create') {
        saved = await create.mutateAsync({ ...body, code: values.code });
        toast({ variant: 'success', message: t('projects.form.created', { code: saved.code }), detail: saved.name });
      } else {
        saved = await update.mutateAsync({ id: target.project.id, body });
        const closed = saved.status === 'CLOSED' && target.project.status !== 'CLOSED';
        toast({ variant: 'success', message: t(closed ? 'projects.form.closed' : 'projects.form.saved', { name: saved.name }) });
      }
      setClosing(null);
      onSaved(saved);
    } catch (error) {
      setClosing(null);
      const fieldErrors = projectFieldErrors(error);
      if (fieldErrors.length === 0) {
        const code = error instanceof ApiError ? error.code : '';
        toast({
          variant: 'danger',
          message: t(target.mode === 'create' ? 'projects.form.createFailed' : 'projects.form.saveFailed', { name: values.name }),
          detail: code === 'auth.forbidden' || code === 'project.not_found' ? t(code === 'auth.forbidden' ? 'error.auth.forbidden' : 'projects.error.not_found') : t('state.errorHint'),
        });
        return;
      }
      for (const { field, message } of fieldErrors) form.setError(field, { type: 'server', message });
      form.setFocus(fieldErrors[0]!.field);
    }
  };

  const submit = form.handleSubmit(async (values) => {
    if (target.mode === 'edit' && values.status === 'CLOSED' && target.project.status !== 'CLOSED') {
      setClosing(values);
      return;
    }
    await save(values);
  });

  return {
    form,
    submit,
    saving: create.isPending || update.isPending,
    closing,
    confirmClose: () => (closing ? save(closing) : undefined),
    cancelClose: () => setClosing(null),
  };
}
