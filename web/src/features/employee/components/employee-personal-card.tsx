// Card "Thông tin cá nhân" of the profile, read view: name, date of birth with the age, gender, phone, email,
// address, and the "Liên hệ khẩn cấp" group. FE-4 turns it into a form in place (`onEdit`).
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { DetailList } from '@/components/ui/detail-list';
import { formatDate, formatPhone, yearsAndMonths } from '@/lib/format';
import type { EmployeeProfile } from '../api';
import { EmployeeEditButton } from './employee-edit-button';

export type EmployeePersonalCardProps = {
  employee: EmployeeProfile;
  /** EMPLOYEE_EDIT: the "Sửa" button is shown. */
  editable: boolean;
  onEdit?: () => void;
  /** Another card is being edited: no "Sửa", and the description says why. */
  locked?: boolean;
};

export function EmployeePersonalCard({ employee, editable, onEdit, locked = false }: EmployeePersonalCardProps) {
  const { t } = useTranslation();
  const { personal } = employee;
  const contact = personal.emergencyContact;
  const or = (value: string | null | undefined) => value || <span className="text-ink-muted">{t('employees.none')}</span>;
  const phone = (value: string | null | undefined) => (value ? <span className="tabular-nums">{formatPhone(value)}</span> : or(null));
  const title = t('employees.profile.personal.title');
  return (
    <Card
      title={title}
      description={editable && locked ? t('employees.edit.locked') : undefined}
      titleAside={editable && !locked ? <EmployeeEditButton part={title.toLowerCase()} onEdit={onEdit} /> : undefined}
    >
      <DetailList
        items={[
          { label: t('employees.profile.fullName'), value: employee.fullName },
          {
            label: t('employees.profile.personal.dateOfBirth'),
            value: (
              <span className="flex flex-col">
                <span className="tabular-nums">{formatDate(personal.dateOfBirth)}</span>
                <span className="text-caption text-ink-muted">{t('employees.profile.personal.age', { count: yearsAndMonths(personal.dateOfBirth).years })}</span>
              </span>
            ),
          },
          { label: t('employees.profile.personal.gender'), value: t(`employees.profile.gender.${personal.gender}`) },
          { label: t('employees.profile.phone'), value: phone(personal.phone) },
          { label: t('employees.profile.email'), value: or(personal.personalEmail) },
          { label: t('employees.profile.personal.address'), value: or(personal.address) },
        ]}
      />
      <div className="flex flex-col gap-3 border-t border-line pt-4">
        <h3 className="text-body-strong">{t('employees.profile.personal.emergency')}</h3>
        <DetailList
          items={[
            { label: t('employees.profile.fullName'), value: or(contact?.name) },
            { label: t('employees.profile.personal.relationship'), value: or(contact?.relationship) },
            { label: t('employees.profile.phone'), value: phone(contact?.phone) },
          ]}
        />
      </div>
    </Card>
  );
}
