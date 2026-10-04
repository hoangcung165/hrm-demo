// State of the company form: values, validation, save, and the toasts that confirm or report it.
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/components/ui/use-toast';
import { ApiError } from '@/lib/api';
import { useUpdateCompany, type Company } from './api';
import { failureHint } from './error-message';
import { backendFieldErrors, COMPANY_FIELDS, companySchema, toCompanyValues, type CompanyValues } from './schemas';

export function useCompanyForm(company: Company) {
  const { t } = useTranslation();
  const toast = useToast();
  const update = useUpdateCompany();
  // Validates a field when the user leaves it, then as they correct it, and everything on submit;
  // on an invalid submit react-hook-form focuses the first invalid field.
  const form = useForm<CompanyValues>({ resolver: zodResolver(companySchema), defaultValues: toCompanyValues(company), mode: 'onTouched' });

  const submit = form.handleSubmit(async (values) => {
    const typed = form.getValues();
    try {
      const saved = await update.mutateAsync(values);
      const latest = form.getValues();
      form.reset(toCompanyValues(saved));
      // Fields stay editable while saving: keep what was typed after the request left.
      for (const field of COMPANY_FIELDS) {
        if (latest[field] !== typed[field]) form.setValue(field, latest[field], { shouldDirty: true });
      }
      toast({ variant: 'success', message: t('company.saved') });
    } catch (error) {
      const fieldErrors = error instanceof ApiError && error.code === 'validation.invalid' ? backendFieldErrors(error.fieldErrors) : [];
      if (fieldErrors.length === 0) {
        toast({ variant: 'danger', message: t('company.saveFailed'), detail: failureHint(error, t) });
        return;
      }
      for (const { field, message } of fieldErrors) form.setError(field, { type: 'server', message });
      form.setFocus(fieldErrors[0]!.field);
    }
  });

  return {
    form,
    submit,
    saving: update.isPending,
    dirty: form.formState.isDirty,
    /** Back to the last saved values, no confirm. */
    discard: () => form.reset(),
  };
}
