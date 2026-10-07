// The fields of "Công việc": the code (read-only), status, unit, position, Quản lý trực tiếp, start date. Shared by
// "Thêm nhân viên" and the card edited in place. Only Thử việc and Chính thức are offered: Đã nghỉ việc is set by
// the resignation flow. A new position must be active; on edit the current one stays, marked when deactivated.
import { addDays, format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { Field } from '@/components/ui/field';
import { FormField } from '@/components/ui/form-field';
import { FormGrid } from '@/components/ui/form-grid';
import { FormSelect } from '@/components/ui/form-select';
import { Input } from '@/components/ui/input';
import { usePositions, type AssignmentRef, type EmployeeRef } from '../api';
import type { EmployeeFormValues } from '../schemas';
import { EmployeeManagerField } from './employee-manager-field';
import { EmployeeUnitField } from './employee-unit-field';

export type EmployeeJobFieldsProps = {
  /** "Trực thuộc công ty" may be chosen. */
  companyScope: boolean;
  /** The code: the expected one on create, the Employee's on edit. Never edited. */
  code: string;
  codeHelper: string;
  statusHelper?: string;
  /** On edit: the Employee and what it has now. */
  current?: { employeeId: string; orgUnit: AssignmentRef | null; position: AssignmentRef; assignedManager: EmployeeRef | null };
};

export function EmployeeJobFields({ companyScope, code, codeHelper, statusHelper, current }: EmployeeJobFieldsProps) {
  const { t } = useTranslation();
  const positions = (usePositions().data ?? []).filter((item) => item.active || item.id === current?.position.id);
  // The current position is listed even before the catalog has loaded, and even when it was deactivated since.
  const options = positions.map((item) => ({ value: item.id, label: item.active ? item.name : t('employees.filter.positionInactive', { name: item.name }) }));
  if (current && !positions.some((item) => item.id === current.position.id)) {
    const { position } = current;
    options.unshift({ value: position.id, label: position.active ? position.name : t('employees.filter.positionInactive', { name: position.name }) });
  }
  return (
    <FormGrid>
      <Field label={t('employees.profile.job.code')} helper={codeHelper}>
        {(control) => <Input {...control} value={code} readOnly disabled className="tabular-nums" />}
      </Field>
      <FormSelect<EmployeeFormValues>
        name="status"
        label={t('employees.col.status')}
        required
        helper={statusHelper}
        options={[
          { value: 'PROBATION', label: t('employees.status.PROBATION') },
          { value: 'OFFICIAL', label: t('employees.status.OFFICIAL') },
        ]}
        placeholder={t('employees.status.PROBATION')}
      />
      <EmployeeUnitField companyScope={companyScope} current={current ? current.orgUnit : undefined} />
      <FormSelect<EmployeeFormValues> name="positionId" label={t('employees.col.position')} required options={options} placeholder={t('employees.create.choosePosition')} />
      <EmployeeManagerField employeeId={current?.employeeId} assigned={current?.assignedManager} />
      <FormField<EmployeeFormValues> name="hireDate" type="date" label={t('employees.col.hireDate')} required max={format(addDays(new Date(), 365), 'yyyy-MM-dd')} />
    </FormGrid>
  );
}
