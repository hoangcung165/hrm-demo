// Fields of the allocate dialog, inside a FormProvider: person, Vai trò dự án, percent and the two dates.
// A date outside the project says the project's dates on the field.
import { useTranslation } from 'react-i18next';
import { FormField } from '@/components/ui/form-field';
import { FormGrid } from '@/components/ui/form-grid';
import { formatDateRange } from '@/lib/format';
import type { Allocation, Project } from '../api';
import type { AllocationFormValues } from '../allocation-schemas';
import { AllocationEmployeeField } from './allocation-employee-field';
import { AllocationRoleField } from './allocation-role-field';

export type AllocationFormFieldsProps = { project: Project; editing?: Allocation };

export function AllocationFormFields({ project, editing }: AllocationFormFieldsProps) {
  const { t } = useTranslation();
  const errorValues = { range: formatDateRange(project.startDate, project.endDate) };
  return (
    <FormGrid>
      <AllocationEmployeeField projectId={project.id} fixed={editing} className="md:col-span-2" />
      <AllocationRoleField current={editing?.projectRole} />
      <FormField<AllocationFormValues>
        name="percent"
        label={t('projects.allocate.percent')}
        helper={t('projects.allocate.percentHelper')}
        required
        inputMode="numeric"
        autoComplete="off"
        trailing={<span className="text-ink-muted">%</span>}
      />
      <FormField<AllocationFormValues> name="startDate" type="date" label={t('projects.allocate.start')} required errorValues={errorValues} />
      <FormField<AllocationFormValues> name="endDate" type="date" label={t('projects.allocate.end')} required errorValues={errorValues} />
    </FormGrid>
  );
}
