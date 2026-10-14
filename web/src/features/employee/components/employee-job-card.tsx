// Card "Vị trí công việc" of the profile, read view: code, unit (with the unit above), position, status, the
// Quản lý trực tiếp (and whether it follows the unit head), and the start date with the length of service.
// FE-4 turns it into a form in place (`onEdit`).
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { DetailList } from '@/components/ui/detail-list';
import { Person } from '@/components/ui/person';
import { formatDate, yearsAndMonths } from '@/lib/format';
import type { EmployeeProfile } from '../api';
import { EmployeeEditButton } from './employee-edit-button';
import { EmployeeStatusBadge } from './employee-status-badge';
import { companyTodayIso } from '@/lib/company-time';

export type EmployeeJobCardProps = {
  employee: EmployeeProfile;
  editable: boolean;
  onEdit?: () => void;
  /** Another card is being edited: no "Sửa", and the description says why. */
  locked?: boolean;
};

export function EmployeeJobCard({ employee, editable, onEdit, locked = false }: EmployeeJobCardProps) {
  const { t } = useTranslation();
  const { job } = employee;
  const withNote = (value: string, note: string | null | undefined) => (
    <span className="flex flex-col">
      <span>{value}</span>
      {note ? <span className="text-caption text-ink-muted">{note}</span> : null}
    </span>
  );
  const inactive = (active: boolean) => (active ? null : t('employees.profile.job.inactive'));
  const service = yearsAndMonths(job.hireDate);
  const started = job.hireDate <= companyTodayIso();
  const title = t('employees.profile.job.title');
  return (
    <Card
      title={title}
      description={editable && locked ? t('employees.edit.locked') : undefined}
      titleAside={editable && !locked ? <EmployeeEditButton part={title.toLowerCase()} onEdit={onEdit} /> : undefined}
    >
      <div className="grid gap-x-6 gap-y-3 md:grid-cols-2">
        <DetailList
          items={[
            { label: t('employees.profile.job.code'), value: <span className="tabular-nums">{employee.code}</span> },
            {
              label: t('employees.filter.unit'),
              value: job.orgUnit
                ? withNote(job.orgUnit.name, [job.orgUnit.parentName, inactive(job.orgUnit.active)].filter(Boolean).join(' · '))
                : <span className="text-ink-muted">{t('employees.underCompany')}</span>,
            },
            { label: t('employees.col.position'), value: withNote(job.position.name, inactive(job.position.active)) },
            { label: t('employees.col.status'), value: <EmployeeStatusBadge status={employee.status} /> },
          ]}
        />
        <DetailList
          items={[
            {
              label: t('employees.col.manager'),
              value: job.manager ? (
                <Person name={job.manager.fullName} caption={t(`employees.profile.managerSource.${job.managerSource}`)} size="md" wrapCaption />
              ) : (
                <span className="text-ink-muted">{t('employees.none')}</span>
              ),
            },
            {
              label: t('employees.col.hireDate'),
              value: withNote(formatDate(job.hireDate), started ? t('employees.profile.job.service', { years: service.years, months: service.months }) : null),
            },
          ]}
        />
      </div>
    </Card>
  );
}
