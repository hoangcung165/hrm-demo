// "Phòng ban phụ trách" of the project form: the org tree in a Select with a search box. Inactive units are tagged;
// the backend refuses one unless the project already had it.
import { useMemo } from 'react';
import { useController, useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Field } from '@/components/ui/field';
import type { TreePickerNode } from '@/components/ui/tree-picker';
import { TreeSelect } from '@/components/ui/tree-select';
import { unitTree } from '@/features/employee/unit-choices';
import { useOrgUnitOptions } from '@/features/org-unit/api';
import type { ProjectFormValues } from '../schemas';

export type ProjectUnitFieldProps = { className?: string };

export function ProjectUnitField({ className }: ProjectUnitFieldProps) {
  const { t } = useTranslation();
  const { field, fieldState } = useController<ProjectFormValues, 'orgUnitId'>({ name: 'orgUnitId', control: useFormContext<ProjectFormValues>().control });
  const units = useOrgUnitOptions();
  const { nodes, tags } = useMemo<{ nodes: TreePickerNode[]; tags: Record<string, string> }>(() => {
    if (!units.data) return { nodes: [], tags: {} };
    return { nodes: unitTree(units.data), tags: Object.fromEntries(units.data.filter((unit) => !unit.active).map((unit) => [unit.id, t('projects.filter.unitInactive')])) };
  }, [units.data, t]);
  const message = fieldState.error?.message;
  return (
    <Field label={t('projects.filter.unit')} required error={message ? t(message) : undefined} className={className}>
      {(control) => (
        <TreeSelect
          {...control}
          ref={field.ref}
          label={t('projects.filter.unit')}
          nodes={nodes}
          value={field.value}
          onChange={field.onChange}
          placeholder={t('projects.form.unitPlaceholder')}
          searchLabel={t('projects.filter.findUnit')}
          noMatchText={t('projects.filter.noUnit')}
          tags={tags}
        />
      )}
    </Field>
  );
}
