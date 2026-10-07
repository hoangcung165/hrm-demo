// Group "Công việc" of the create form: the expected code, status, unit, position, Quản lý trực tiếp, start date.
import { addDays, format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { Field } from '@/components/ui/field';
import { FormField } from '@/components/ui/form-field';
import { FormGrid } from '@/components/ui/form-grid';
import { FormGroup } from '@/components/ui/form-group';
import { FormSelect } from '@/components/ui/form-select';
import { Input } from '@/components/ui/input';
import { useNextEmployeeCode, usePositions } from '../api';
import type { EmployeeCreateValues } from '../schemas';
import { EmployeeManagerField } from './employee-manager-field';
import { EmployeeUnitField } from './employee-unit-field';

export type EmployeeCreateJobProps = {
  /** "Trực thuộc công ty" may be chosen. */
  companyScope: boolean;
};

export function EmployeeCreateJob({ companyScope }: EmployeeCreateJobProps) {
  const { t } = useTranslation();
  const code = useNextEmployeeCode();
  // A new Employee gets an active position only.
  const positions = (usePositions().data ?? []).filter((item) => item.active);
  return (
    <FormGroup legend={t('employees.create.job')}>
      <FormGrid>
        <Field label={t('employees.profile.job.code')} helper={t('employees.create.codeHelper')}>
          {(control) => <Input {...control} value={code.data ?? ''} readOnly disabled className="tabular-nums" />}
        </Field>
        <FormSelect<EmployeeCreateValues>
          name="status"
          label={t('employees.col.status')}
          required
          options={[
            { value: 'PROBATION', label: t('employees.status.PROBATION') },
            { value: 'OFFICIAL', label: t('employees.status.OFFICIAL') },
          ]}
          placeholder={t('employees.status.PROBATION')}
        />
        <EmployeeUnitField companyScope={companyScope} />
        <FormSelect<EmployeeCreateValues>
          name="positionId"
          label={t('employees.col.position')}
          required
          options={positions.map((item) => ({ value: item.id, label: item.name }))}
          placeholder={t('employees.create.choosePosition')}
        />
        <EmployeeManagerField />
        <FormField<EmployeeCreateValues> name="hireDate" type="date" label={t('employees.col.hireDate')} required max={format(addDays(new Date(), 365), 'yyyy-MM-dd')} />
      </FormGrid>
    </FormGroup>
  );
}
