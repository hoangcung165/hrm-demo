// State of the "Cấu hình nghỉ phép" form for one type (or a new one): values, checks, save, server errors on their
// fields, and the toasts. Saving an existing type renames it when the name changed, then saves the policy as a
// version from its date.
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/components/ui/use-toast';
import { errorMessage } from '@/features/auth/error-message';
import { companyTodayIso } from '@/lib/company-time';
import { formatDate } from '@/lib/format';
import { useCreateLeaveType, useSaveLeavePolicy, useUpdateLeaveType, type LeaveTypeItem } from './policy-api';
import { policyBody, policyFieldErrors, policyFormValues, policySchema, type PolicyFormValues } from './policy-schema';

export function useLeavePolicyForm(type: LeaveTypeItem | null, onSaved: (saved: LeaveTypeItem) => void) {
  const { t } = useTranslation();
  const toast = useToast();
  const today = companyTodayIso();
  const create = useCreateLeaveType();
  const rename = useUpdateLeaveType(type?.id ?? '');
  const savePolicy = useSaveLeavePolicy(type?.id ?? '');
  const form = useForm<PolicyFormValues>({ resolver: zodResolver(policySchema), defaultValues: policyFormValues(type, today), mode: 'onTouched' });

  const save = async (values: PolicyFormValues) => {
    const body = policyBody(values);
    try {
      let saved: LeaveTypeItem;
      if (!type) {
        saved = await create.mutateAsync({ code: values.code.trim(), name: values.name.trim(), policy: body });
        toast({ variant: 'success', message: t('leave.policy.created', { name: saved.name }), detail: t('leave.policy.savedFrom', { date: formatDate(body.effectiveFrom) }) });
      } else {
        if (values.name.trim() !== type.name) await rename.mutateAsync({ name: values.name.trim(), active: type.active });
        saved = await savePolicy.mutateAsync(body);
        toast({ variant: 'success', message: t('leave.policy.saved', { name: saved.name }), detail: t('leave.policy.savedFrom', { date: formatDate(body.effectiveFrom) }) });
      }
      form.reset(policyFormValues(saved, today));
      onSaved(saved);
    } catch (error) {
      const fieldErrors = policyFieldErrors(error);
      if (!fieldErrors.length) {
        toast({ variant: 'danger', message: t('leave.policy.saveFailed', { name: values.name }), detail: errorMessage(error, t) });
        return;
      }
      for (const { field, message } of fieldErrors) form.setError(field, { type: 'server', message });
      form.setFocus(fieldErrors[0]!.field);
    }
  };

  return {
    form,
    submit: form.handleSubmit(save),
    saving: create.isPending || rename.isPending || savePolicy.isPending,
    discard: () => form.reset(policyFormValues(type, today)),
  };
}
