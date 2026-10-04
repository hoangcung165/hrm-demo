// Fields of the add/edit unit form, inside a FormProvider. The parent is a choice when adding and read-only when editing
// (it changes through "Chuyển đơn vị"); the head stays disabled until Employees exist (HRM-06).
import { useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Field } from '@/components/ui/field';
import { FormField } from '@/components/ui/form-field';
import { FormGrid } from '@/components/ui/form-grid';
import { FormSelect } from '@/components/ui/form-select';
import { Select } from '@/components/ui/select';
import { findNode, parentChoices, type OrgNode } from '../org-tree';
import { CODE_MAX, NAME_MAX, ORG_UNIT_TYPES, type OrgUnitValues } from '../schemas';
import type { OrgUnitFormTarget } from '../use-org-unit-form';

export type OrgUnitFormFieldsProps = {
  target: OrgUnitFormTarget;
  root: OrgNode;
  /** Placeholder values of server messages, by field. */
  errorValues: Partial<Record<keyof OrgUnitValues, Record<string, string>>>;
};

const noChange = () => {};

export function OrgUnitFormFields({ target, root, errorValues }: OrgUnitFormFieldsProps) {
  const { t } = useTranslation();
  const { setValue, getFieldState } = useFormContext<OrgUnitValues>();
  const head = target.mode === 'edit' ? target.unit.head : null;
  const parent = target.mode === 'edit' ? (findNode(root, target.unit.parentId) ?? root) : null;
  return (
    <FormGrid>
      <FormField<OrgUnitValues> name="name" label={t('org.form.name')} required maxLength={NAME_MAX} autoComplete="off" className="md:col-span-2" />
      <FormField<OrgUnitValues>
        name="code"
        label={t('org.form.code')}
        helper={t('org.form.codeHelper')}
        errorValues={errorValues.code}
        required
        maxLength={CODE_MAX}
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        // Shown in capitals while typing; the value itself is upper-cased when the field is left and again on submit.
        className="[&_input]:uppercase"
        rules={{ onBlur: (event: { target: HTMLInputElement }) => setValue('code', event.target.value.trim().toUpperCase(), { shouldValidate: getFieldState('code').isTouched }) }}
      />
      <FormSelect<OrgUnitValues>
        name="type"
        label={t('org.form.type')}
        required
        placeholder={t('org.form.typePlaceholder')}
        options={ORG_UNIT_TYPES.map((type) => ({ value: type, label: t(`org.type.${type}`) }))}
      />
      {parent ? (
        <Field label={t('org.form.parent')} helper={t('org.form.parentHelper')}>
          {(control) => <Select {...control} disabled value={parent.id} onChange={noChange} options={[{ value: parent.id, label: parent.name }]} placeholder="" />}
        </Field>
      ) : (
        <FormSelect<OrgUnitValues>
          name="parentId"
          label={t('org.form.parent')}
          required
          placeholder={t('org.form.parentPlaceholder')}
          options={parentChoices(root).map((choice) => ({ value: choice.id, label: choice.name, level: choice.level }))}
        />
      )}
      <Field label={t('org.form.head')} helper={t('org.form.headHelper')}>
        {(control) => (
          <Select {...control} disabled value={head ? 'head' : ''} onChange={noChange} options={head ? [{ value: 'head', label: head.fullName }] : []} placeholder={t('org.form.headPlaceholder')} />
        )}
      </Field>
    </FormGrid>
  );
}
