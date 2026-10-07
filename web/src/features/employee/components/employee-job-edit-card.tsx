// "Vị trí công việc" edited in place (`PUT …/job`). The code is read-only; the status switches between Thử việc and
// Chính thức only. A unit outside the caller's scope is refused under the unit.
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useCurrentAccount } from '@/features/auth/account-context';
import type { EmployeeProfile } from '../api';
import { jobPart } from '../create-request';
import { JOB_EDIT_PATHS } from '../edit-requests';
import { jobEditSchema } from '../schemas';
import { useProfileCardForm } from '../use-profile-card-form';
import { EmployeeEditCard } from './employee-edit-card';
import { EmployeeJobFields } from './employee-job-fields';
import { EmployeeUnitChangeAlert } from './employee-unit-change-alert';

export type EmployeeJobEditCardProps = { employee: EmployeeProfile };

export function EmployeeJobEditCard({ employee }: EmployeeJobEditCardProps) {
  const { t } = useTranslation();
  const companyScope = useCurrentAccount().dataScope === 'COMPANY';
  const { job } = employee;
  const schema = useMemo(() => jobEditSchema(employee.personal.dateOfBirth, companyScope), [employee, companyScope]);
  const card = useProfileCardForm({
    employee,
    part: 'job',
    schema,
    toBody: jobPart,
    paths: JOB_EDIT_PATHS,
    forbidden: (values) => (values.orgUnitId !== (job.orgUnit?.id ?? '') ? { field: 'orgUnitId', message: 'employees.edit.unitOutOfScope' } : null),
    first: 'status',
  });
  return (
    <EmployeeEditCard title={t('employees.profile.job.title')} saveLabel={t('employees.edit.save.job')} card={card}>
      <EmployeeJobFields
        companyScope={companyScope}
        code={employee.code}
        codeHelper={t('employees.edit.codeHelper')}
        statusHelper={t('employees.edit.statusHelper')}
        current={{ employeeId: employee.id, orgUnit: job.orgUnit, position: job.position, assignedManager: job.managerSource === 'ASSIGNED' ? job.manager : null }}
      />
      <EmployeeUnitChangeAlert employee={employee} />
    </EmployeeEditCard>
  );
}
