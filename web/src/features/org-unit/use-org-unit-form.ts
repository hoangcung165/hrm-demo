// State of the add/edit unit form: values, validation, save, server errors on their fields, and the toasts.
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/components/ui/use-toast';
import { ApiError } from '@/lib/api';
import { useCreateOrgUnit, useUpdateOrgUnit, type OrgUnit, type OrgUnitType } from './api';
import { findNode, ROOT_ID, type OrgNode } from './org-tree';
import { orgUnitFieldErrors, orgUnitSchema, type OrgUnitValues } from './schemas';

/** What the dialog works on: a new unit under `parentId` (`ROOT_ID` = the company), or an existing unit. */
export type OrgUnitFormTarget = { mode: 'add'; parentId: string } | { mode: 'edit'; unit: OrgNode };

function initialValues(target: OrgUnitFormTarget): OrgUnitValues {
  if (target.mode === 'add') return { name: '', code: '', type: '', parentId: target.parentId };
  const { unit } = target;
  return { name: unit.name, code: unit.code ?? '', type: unit.type, parentId: unit.parentId ?? ROOT_ID };
}

export function useOrgUnitForm(target: OrgUnitFormTarget, root: OrgNode, onSaved: (unit: OrgUnit) => void) {
  const { t } = useTranslation();
  const toast = useToast();
  const create = useCreateOrgUnit();
  const update = useUpdateOrgUnit();
  // Text fields validate when the user leaves them, then as they correct them; an invalid submit focuses the first invalid field.
  const form = useForm<OrgUnitValues>({ resolver: zodResolver(orgUnitSchema), defaultValues: initialValues(target), mode: 'onTouched' });
  // Placeholder values of a server message, e.g. which unit holds the code.
  const [errorValues, setErrorValues] = useState<Partial<Record<keyof OrgUnitValues, Record<string, string>>>>({});

  const submit = form.handleSubmit(async (values) => {
    const type = values.type as OrgUnitType;
    try {
      let saved: OrgUnit;
      if (target.mode === 'add') {
        const parentId = values.parentId === ROOT_ID ? null : values.parentId;
        saved = await create.mutateAsync({ name: values.name, code: values.code, type, parentId, headEmployeeId: null });
        toast({ variant: 'success', message: t('org.form.added', { name: saved.name }), detail: t('org.form.addedDetail', { parent: findNode(root, values.parentId)?.name ?? root.name }) });
      } else {
        // The head cannot be changed here yet; send the current one so the save does not clear it.
        const body = { name: values.name, code: values.code, type, headEmployeeId: target.unit.head?.employeeId ?? null };
        saved = await update.mutateAsync({ id: target.unit.id, body });
        toast({ variant: 'success', message: t('org.form.saved', { name: saved.name }) });
      }
      onSaved(saved);
    } catch (error) {
      const fieldErrors = orgUnitFieldErrors(error, values);
      if (fieldErrors.length === 0) {
        const code = error instanceof ApiError ? error.code : '';
        const known = code === 'auth.forbidden' || code === 'org_unit.not_found';
        toast({
          variant: 'danger',
          message: t(target.mode === 'add' ? 'org.form.addFailed' : 'org.form.saveFailed', { name: values.name }),
          detail: known ? t(`error.${code}`) : t('state.errorHint'),
        });
        return;
      }
      setErrorValues(Object.fromEntries(fieldErrors.map(({ field, values: shown }) => [field, shown])));
      for (const { field, message } of fieldErrors) form.setError(field, { type: 'server', message });
      form.setFocus(fieldErrors[0]!.field);
    }
  });

  return { form, submit, saving: create.isPending || update.isPending, errorValues };
}
