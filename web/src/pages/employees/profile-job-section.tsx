// Tab "Công việc": "Vị trí công việc", a warning when nobody approves this person's requests, and the note that
// transfers will go through HR documents.
import { useTranslation } from 'react-i18next';
import { Alert } from '@/components/ui/alert';
import { useCurrentAccount } from '@/features/auth/account-context';
import type { EmployeeProfile } from '@/features/employee/api';
import { EmployeeJobCard } from '@/features/employee/components/employee-job-card';
import { useOrgStructure } from '@/features/org-unit/api';

export type ProfileJobSectionProps = { employee: EmployeeProfile; canEdit: boolean };

export function ProfileJobSection({ employee, canEdit }: ProfileJobSectionProps) {
  const { t } = useTranslation();
  // The profile names the unit only; the unit above comes from the org tree, for those who may read it.
  const structure = useOrgStructure(useCurrentAccount().permissions.includes('ORG_VIEW'));
  const units = structure.data?.units ?? [];
  const parentId = units.find((unit) => unit.id === employee.job.orgUnit?.id)?.parentId;
  const parentName = parentId ? units.find((unit) => unit.id === parentId)?.name : undefined;
  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <EmployeeJobCard employee={employee} unitParentName={parentName} editable={canEdit} />
      {employee.job.manager ? null : (
        <Alert variant="warning" title={t('employees.profile.job.noManager.title')}>
          {t('employees.profile.job.noManager.text', { name: employee.fullName })}
        </Alert>
      )}
      <Alert variant="info" title={t('employees.profile.job.note.title')}>
        {t('employees.profile.job.note.text')}
      </Alert>
    </div>
  );
}
