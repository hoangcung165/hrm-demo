// State of the allocate dialog (add and edit): values, validation, save, server errors on their fields, and the toasts.
// Saving an overload succeeds; the toast then warns and offers "Sửa phân bổ".
import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/components/ui/use-toast';
import { ApiError } from '@/lib/api';
import type { Allocation, Project } from './api';
import { useSaveAllocation, type AllocationSaveResponse } from './allocation-api';
import { overloadText } from './allocation-overload-text';
import { allocationFieldErrors, allocationSchema, parsePercent, type AllocationFormValues } from './allocation-schemas';
import { companyTodayIso } from '@/lib/company-time';

/** A new allocation, or an existing one (its Employee never changes). */
export type AllocationTarget = { mode: 'add' } | { mode: 'edit'; allocation: Allocation };

function initialValues(project: Project, target: AllocationTarget): AllocationFormValues {
  if (target.mode === 'edit') {
    const a = target.allocation;
    return { employeeId: a.employee?.id ?? '', projectRoleId: a.projectRole?.id ?? '', percent: String(a.percent), startDate: a.startDate, endDate: a.endDate };
  }
  // From today, or from the project's first day when it has not started; never past its last day.
  const today = companyTodayIso();
  const start = today < project.startDate ? project.startDate : today > project.endDate ? project.endDate : today;
  return { employeeId: '', projectRoleId: '', percent: '', startDate: start, endDate: project.endDate };
}

export type AllocationFormOptions = {
  project: Project;
  target: AllocationTarget;
  /** The allocation saved: close the dialog. */
  onSaved: (saved: AllocationSaveResponse) => void;
  /** The "Sửa phân bổ" action of the warning toast. */
  onEditAgain: (allocation: Allocation) => void;
};

export function useAllocationForm({ project, target, onSaved, onEditAgain }: AllocationFormOptions) {
  const { t } = useTranslation();
  const toast = useToast();
  const mutation = useSaveAllocation();
  const range = useMemo(() => ({ start: project.startDate, end: project.endDate }), [project.startDate, project.endDate]);
  const form = useForm<AllocationFormValues>({ resolver: zodResolver(allocationSchema(range)), defaultValues: initialValues(project, target), mode: 'onTouched' });
  const editing = target.mode === 'edit';

  const submit = form.handleSubmit(async (values) => {
    const base = { projectRoleId: values.projectRoleId, percent: parsePercent(values.percent)!, startDate: values.startDate, endDate: values.endDate };
    try {
      const saved = await mutation.mutateAsync({
        projectId: project.id,
        allocationId: editing ? target.allocation.id : null,
        body: editing ? base : { ...base, employeeId: values.employeeId },
      });
      const name = saved.allocation.employee?.fullName ?? '';
      const over = overloadText(saved.check, name, t);
      toast(
        over
          ? { variant: 'success', message: t('projects.allocate.savedOver', { name }), detail: over.title, action: { label: t('projects.allocate.editAgain'), onClick: () => onEditAgain(saved.allocation) } }
          : { variant: 'success', message: t(editing ? 'projects.allocate.updated' : 'projects.allocate.saved', { name }) },
      );
      onSaved(saved);
    } catch (error) {
      const fieldErrors = allocationFieldErrors(error);
      if (fieldErrors.length === 0) {
        const code = error instanceof ApiError ? error.code : '';
        toast({
          variant: 'danger',
          message: t('projects.allocate.saveFailed'),
          detail: code === 'project.closed' ? t('projects.allocate.error.closed') : code === 'auth.forbidden' ? t('error.auth.forbidden') : t('state.errorHint'),
        });
        return;
      }
      for (const { field, message } of fieldErrors) form.setError(field, { type: 'server', message });
      form.setFocus(fieldErrors[0]!.field);
    }
  });

  return { form, submit, saving: mutation.isPending, editing, range };
}
