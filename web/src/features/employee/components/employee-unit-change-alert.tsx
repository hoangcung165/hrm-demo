// On the job card in edit mode: a unit change while following the unit head moves the Quản lý trực tiếp too. Says
// to whom, and that requests already waiting stay with the manager before.
import { useFormContext, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Alert } from '@/components/ui/alert';
import { useOrgStructure } from '@/features/org-unit/api';
import type { EmployeeProfile } from '../api';
import { useDefaultManager } from '../form-api';
import type { EmployeeFormValues } from '../schemas';

export type EmployeeUnitChangeAlertProps = { employee: EmployeeProfile };

export function EmployeeUnitChangeAlert({ employee }: EmployeeUnitChangeAlertProps) {
  const { t } = useTranslation();
  const { control } = useFormContext<EmployeeFormValues>();
  const [orgUnitId, mode] = useWatch({ control, name: ['orgUnitId', 'managerMode'] });
  const preview = useDefaultManager(orgUnitId, employee.id);
  const units = useOrgStructure().data?.units ?? [];
  const { job } = employee;
  const before = job.orgUnit?.id ?? '';
  const head = preview.data;
  if (orgUnitId === before || mode !== 'UNIT_HEAD' || !preview.isSuccess || head?.id === job.manager?.id) return null;
  const underCompany = t('employees.underCompany');
  const title = t('employees.edit.unitChange.title', {
    from: job.orgUnit?.name ?? underCompany,
    to: units.find((unit) => unit.id === orgUnitId)?.name ?? underCompany,
  });
  const managerText = head ? t('employees.edit.unitChange.manager', { head: head.fullName }) : t('employees.edit.unitChange.noManager');
  const waiting = job.manager ? ` ${t('employees.edit.unitChange.waiting', { manager: job.manager.fullName })}` : '';
  return (
    <Alert variant="warning" title={title}>
      {managerText}
      {waiting}
    </Alert>
  );
}
