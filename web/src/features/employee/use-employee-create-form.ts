// State of "Thêm nhân viên": values, validation (on blur, then while correcting, and on submit), the POST, the
// server's refusals under their fields, and the way to the new profile.
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { useToast } from '@/components/ui/use-toast';
import { useCurrentAccount } from '@/features/auth/account-context';
import { ApiError } from '@/lib/api';
import type { EmployeeProfile } from './api';
import { useCreateEmployee } from './form-api';
import { createFieldErrors, toCreateRequest } from './create-request';
import { EMPTY_EMPLOYEE, employeeCreateSchema, type EmployeeFormField, type EmployeeFormValues } from './schemas';

export function useEmployeeCreateForm() {
  const { t } = useTranslation();
  const toast = useToast();
  const navigate = useNavigate();
  // Only an Account that sees the whole company may put an Employee directly under it.
  const companyScope = useCurrentAccount().dataScope === 'COMPANY';
  const schema = useMemo(() => employeeCreateSchema({ companyScope }), [companyScope]);
  const form = useForm<EmployeeFormValues>({ resolver: zodResolver(schema), defaultValues: EMPTY_EMPLOYEE, mode: 'onTouched' });
  const create = useCreateEmployee();
  /** Placeholder values of server messages, e.g. the holder of a CCCD. */
  const [errorValues, setErrorValues] = useState<Partial<Record<EmployeeFormField, Record<string, string>>>>({});
  const [created, setCreated] = useState<EmployeeProfile | null>(null);

  // After the render that turned the leave guard off.
  useEffect(() => {
    if (created) navigate(`/employees/${created.id}`);
    // `navigate` is stable enough; only a new Employee moves on.
  }, [created]);

  const submit = form.handleSubmit(async (values) => {
    try {
      const profile = await create.mutateAsync(toCreateRequest(values));
      toast({ variant: 'success', message: t('employees.create.added', { name: profile.fullName, code: profile.code }) });
      setCreated(profile);
    } catch (error) {
      const fields = createFieldErrors(error, values);
      if (fields.length === 0) {
        const forbidden = error instanceof ApiError && error.code === 'auth.forbidden';
        toast({ variant: 'danger', message: t('employees.create.failed', { name: values.fullName.trim() }), detail: t(forbidden ? 'error.auth.forbidden' : 'state.errorHint') });
        return;
      }
      setErrorValues(Object.fromEntries(fields.map((each) => [each.field, each.values ?? {}])));
      for (const { field, message } of fields) form.setError(field, { type: 'server', message });
      form.setFocus(fields[0]!.field);
    }
  });

  const errorCount = Object.keys(form.formState.errors).length;
  return {
    form,
    submit,
    saving: create.isPending,
    companyScope,
    errorValues,
    /** Fields with an error after a submit: the summary Alert above the form. */
    summaryCount: form.formState.submitCount > 0 ? errorCount : 0,
    /** Input that would be lost by leaving. */
    unsaved: form.formState.isDirty && !created,
  };
}
