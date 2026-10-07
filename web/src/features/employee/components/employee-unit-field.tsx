// "Đơn vị tổ chức" of the create form: the active units in a Tree picker menu. "Trực thuộc công ty" (no unit) is the
// first row, and the default, only for an Account that sees the whole company; the helper shows the unit's path.
import { useMemo } from 'react';
import { useController, useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Field } from '@/components/ui/field';
import { TreeSelect } from '@/components/ui/tree-select';
import { useCurrentAccount } from '@/features/auth/account-context';
import { useOrgStructure } from '@/features/org-unit/api';
import type { EmployeeCreateValues } from '../schemas';
import { unitChoices, unitPath } from '../unit-choices';

export type EmployeeUnitFieldProps = { companyScope: boolean; className?: string };

export function EmployeeUnitField({ companyScope, className }: EmployeeUnitFieldProps) {
  const { t } = useTranslation();
  const { orgUnitIds } = useCurrentAccount();
  const structure = useOrgStructure();
  const { field, fieldState } = useController<EmployeeCreateValues, 'orgUnitId'>({ name: 'orgUnitId', control: useFormContext<EmployeeCreateValues>().control });
  const nodes = useMemo(
    () => (structure.data ? unitChoices(structure.data, companyScope ? undefined : new Set(orgUnitIds)) : []),
    [structure.data, companyScope, orgUnitIds],
  );
  const label = t('employees.filter.unit');
  const message = fieldState.error?.message;
  return (
    <Field
      label={label}
      required={!companyScope}
      helper={field.value && structure.data ? unitPath(structure.data, field.value) : undefined}
      error={message ? t(message) : undefined}
      className={className}
    >
      {(control) => (
        <TreeSelect
          {...control}
          ref={field.ref}
          label={label}
          nodes={nodes}
          value={field.value}
          onChange={(id) => {
            field.onChange(id);
            field.onBlur();
          }}
          allLabel={companyScope ? t('employees.underCompany') : undefined}
          placeholder={t('employees.create.chooseUnit')}
          searchLabel={t('employees.filter.findUnit')}
          noMatchText={t('employees.filter.noUnit')}
        />
      )}
    </Field>
  );
}
