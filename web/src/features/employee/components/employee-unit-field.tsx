// "Đơn vị tổ chức" of the employee forms: the active units in a Tree picker menu. "Trực thuộc công ty" (no unit) is
// the first row only for an Account that sees the whole company; the helper shows the unit's path. On edit the
// current unit stays choosable (tagged when deactivated since), and a change says what it was before.
import { useMemo } from 'react';
import { useController, useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Field } from '@/components/ui/field';
import { TreeSelect } from '@/components/ui/tree-select';
import { useCurrentAccount } from '@/features/auth/account-context';
import { useOrgStructure } from '@/features/org-unit/api';
import type { AssignmentRef } from '../api';
import type { EmployeeFormValues } from '../schemas';
import { unitChoices, unitPath } from '../unit-choices';

export type EmployeeUnitFieldProps = {
  companyScope: boolean;
  /** On edit: the unit the Employee is in now (`null`: directly under the company). */
  current?: AssignmentRef | null;
  className?: string;
};

export function EmployeeUnitField({ companyScope, current, className }: EmployeeUnitFieldProps) {
  const { t } = useTranslation();
  const { orgUnitIds } = useCurrentAccount();
  const structure = useOrgStructure();
  const { field, fieldState } = useController<EmployeeFormValues, 'orgUnitId'>({ name: 'orgUnitId', control: useFormContext<EmployeeFormValues>().control });
  const nodes = useMemo(
    () => (structure.data ? unitChoices(structure.data, companyScope ? undefined : new Set(orgUnitIds), current?.id) : []),
    [structure.data, companyScope, orgUnitIds, current],
  );
  const tags = current && !current.active ? { [current.id]: t('employees.unitInactive') } : undefined;
  const path = field.value && structure.data ? unitPath(structure.data, field.value) : '';
  // On edit, once the unit changed: "… Trước đó: {unit}."
  const before = current !== undefined && field.value !== (current?.id ?? '') ? t('employees.edit.unitBefore', { unit: current?.name ?? t('employees.underCompany') }) : '';
  const label = t('employees.filter.unit');
  const message = fieldState.error?.message;
  return (
    <Field
      label={label}
      required={!companyScope}
      helper={[path, before].filter(Boolean).join('. ') || undefined}
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
          tags={tags}
        />
      )}
    </Field>
  );
}
