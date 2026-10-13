// Fields of the create/edit project form, inside a FormProvider. The code is set once: read-only when editing.
// The client is optional (empty: an internal project); the labor budget is optional, in VND.
import { useTranslation } from 'react-i18next';
import { FormField } from '@/components/ui/form-field';
import { FormGrid } from '@/components/ui/form-grid';
import { FormSelect } from '@/components/ui/form-select';
import type { PickedEmployee } from '@/features/employee/use-employee-picker';
import { PROJECT_STATUSES } from '../api';
import { CLIENT_MAX, CODE_MAX, NAME_MAX, type ProjectFormValues } from '../schemas';
import type { ProjectFormTarget } from '../use-project-form';
import { ProjectPmField } from './project-pm-field';
import { ProjectShortenWarning } from './project-shorten-warning';
import { ProjectUnitField } from './project-unit-field';

export type ProjectFormFieldsProps = {
  target: ProjectFormTarget;
  /** PROJECT_EDIT_ALL: any PM may be chosen; otherwise the PM is fixed. */
  freePm: boolean;
  /** The PM the form starts with. */
  pm: PickedEmployee | null;
};

export function ProjectFormFields({ target, freePm, pm }: ProjectFormFieldsProps) {
  const { t } = useTranslation();
  const editing = target.mode === 'edit';
  return (
    <div className="flex flex-col gap-4">
      <FormGrid>
        <FormField<ProjectFormValues>
          name="code"
          label={t('projects.form.code')}
          helper={editing ? t('projects.form.codeFixed') : t('projects.form.codeHelper')}
          required={!editing}
          readOnly={editing}
          maxLength={CODE_MAX}
          autoComplete="off"
          spellCheck={false}
          wrapperClassName={editing ? 'bg-surface-muted text-ink-muted' : undefined}
        />
        <FormSelect<ProjectFormValues>
          name="status"
          label={t('projects.col.status')}
          required
          placeholder=""
          options={PROJECT_STATUSES.filter((status) => editing || status !== 'CLOSED').map((status) => ({ value: status, label: t(`projects.status.${status}`) }))}
        />
        <FormField<ProjectFormValues> name="name" label={t('projects.form.name')} required maxLength={NAME_MAX} autoComplete="off" className="md:col-span-2" />
        <FormField<ProjectFormValues>
          name="client"
          label={t('projects.form.client')}
          placeholder={t('projects.form.clientPlaceholder')}
          maxLength={CLIENT_MAX}
          autoComplete="off"
          className="md:col-span-2"
        />
        {/* The search box and its list need the full width; the fixed PM is a plain select. */}
        <ProjectPmField free={freePm} initial={pm} className={freePm ? 'md:col-span-2' : undefined} />
        <ProjectUnitField className={freePm ? 'md:col-span-2' : undefined} />
        <FormField<ProjectFormValues> name="startDate" type="date" label={t('projects.form.start')} required />
        <FormField<ProjectFormValues> name="endDate" type="date" label={t('projects.form.end')} required />
        <FormField<ProjectFormValues>
          name="laborBudget"
          label={t('projects.detail.budget')}
          helper={t('projects.form.budgetHelper')}
          inputMode="numeric"
          autoComplete="off"
          trailing={<span className="text-ink-muted">₫</span>}
          className="md:col-span-2"
        />
      </FormGrid>
      {editing ? <ProjectShortenWarning project={target.project} /> : null}
    </div>
  );
}
