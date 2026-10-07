// The foot note of a card in edit mode: "2 thay đổi: Đơn vị tổ chức, Quản lý trực tiếp", or, after a save with
// errors, "Chưa lưu được: 2 trường cần sửa." in danger.
import { useTranslation } from 'react-i18next';
import type { EmployeeFormField } from '../schemas';

export type EmployeeEditMetaProps = { changed: EmployeeFormField[]; errorCount: number };

/** The label of each field, as the forms show it. Fields that only steer another (the MST box) count as theirs. */
const LABELS: Partial<Record<EmployeeFormField, string>> = {
  fullName: 'employees.profile.fullName',
  dateOfBirth: 'employees.profile.personal.dateOfBirth',
  gender: 'employees.profile.personal.gender',
  phone: 'employees.profile.phone',
  personalEmail: 'employees.profile.email',
  address: 'employees.profile.personal.address',
  contactName: 'employees.edit.contactName',
  contactRelationship: 'employees.profile.personal.relationship',
  contactPhone: 'employees.edit.contactPhone',
  idNumber: 'employees.profile.identity.idNumber',
  idIssueDate: 'employees.profile.identity.idIssueDate',
  idIssuePlace: 'employees.profile.identity.idIssuePlace',
  taxCodeFromId: 'employees.profile.identity.taxCode',
  taxCode: 'employees.profile.identity.taxCode',
  socialInsuranceNumber: 'employees.profile.identity.socialInsuranceNumber',
  orgUnitId: 'employees.filter.unit',
  positionId: 'employees.col.position',
  managerMode: 'employees.col.manager',
  managerId: 'employees.col.manager',
  hireDate: 'employees.col.hireDate',
  status: 'employees.col.status',
};

export function EmployeeEditMeta({ changed, errorCount }: EmployeeEditMetaProps) {
  const { t } = useTranslation();
  if (errorCount > 0) return <span className="text-danger">{t('employees.edit.notSaved', { count: errorCount })}</span>;
  const labels = [...new Set(changed.flatMap((field) => (LABELS[field] ? [t(LABELS[field]!)] : [])))];
  return labels.length > 0 ? <span>{t('employees.edit.changes', { count: labels.length, fields: labels.join(', ') })}</span> : null;
}
