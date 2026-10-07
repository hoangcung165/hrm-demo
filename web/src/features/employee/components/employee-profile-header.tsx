// The head of an Employee profile: name, status, "code · position · unit", and the quick facts (Quản lý trực tiếp,
// Ngày vào làm, Email, Số điện thoại).
import { useTranslation } from 'react-i18next';
import { Person } from '@/components/ui/person';
import { ProfileHeader } from '@/components/ui/profile-header';
import { formatDate, formatPhone } from '@/lib/format';
import type { EmployeeProfile } from '../api';
import { EmployeeStatusBadge } from './employee-status-badge';

export type EmployeeProfileHeaderProps = { employee: EmployeeProfile };

export function EmployeeProfileHeader({ employee }: EmployeeProfileHeaderProps) {
  const { t } = useTranslation();
  const { job, personal } = employee;
  const none = <span className="text-ink-muted">{t('employees.none')}</span>;
  return (
    <ProfileHeader
      name={employee.fullName}
      badge={<EmployeeStatusBadge status={employee.status} />}
      caption={[employee.code, job.position.name, job.orgUnit?.name ?? t('employees.underCompany')].join(' · ')}
      facts={[
        {
          label: t('employees.col.manager'),
          value: job.manager ? <Person name={job.manager.fullName} caption={t(`employees.profile.managerSource.${job.managerSource}`)} /> : none,
        },
        { label: t('employees.col.hireDate'), value: <span className="tabular-nums">{formatDate(job.hireDate)}</span> },
        { label: t('employees.profile.email'), value: personal.personalEmail ?? none },
        { label: t('employees.profile.phone'), value: personal.phone ? <span className="tabular-nums">{formatPhone(personal.phone)}</span> : none },
      ]}
    />
  );
}
