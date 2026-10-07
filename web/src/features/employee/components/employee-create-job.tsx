// Group "Công việc" of the create form, with the code the new Employee is expected to get.
import { useTranslation } from 'react-i18next';
import { FormGroup } from '@/components/ui/form-group';
import { useNextEmployeeCode } from '../form-api';
import { EmployeeJobFields } from './employee-job-fields';

export type EmployeeCreateJobProps = {
  /** "Trực thuộc công ty" may be chosen. */
  companyScope: boolean;
};

export function EmployeeCreateJob({ companyScope }: EmployeeCreateJobProps) {
  const { t } = useTranslation();
  const code = useNextEmployeeCode();
  return (
    <FormGroup legend={t('employees.create.job')}>
      <EmployeeJobFields companyScope={companyScope} code={code.data ?? ''} codeHelper={t('employees.create.codeHelper')} />
    </FormGroup>
  );
}
