// "Thêm nhân viên" (pattern P4): one Card "Hồ sơ mới" with the groups Thông tin cá nhân, Giấy tờ định danh and
// Công việc, one POST. After a submit with errors a danger Alert above says how many fields to fix; the first
// invalid field takes focus. Fields are read-only while saving. Leaving with input asks first.
import { FormProvider } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { UnsavedChangesGuard } from '@/components/layout/unsaved-changes-guard';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useEmployeeCreateForm } from '../use-employee-create-form';
import { EmployeeCreateIdentity } from './employee-create-identity';
import { EmployeeCreateJob } from './employee-create-job';
import { EmployeeCreatePersonal } from './employee-create-personal';

export function EmployeeCreateForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { form, submit, saving, companyScope, errorValues, summaryCount, unsaved } = useEmployeeCreateForm();
  return (
    <FormProvider {...form}>
      <form noValidate onSubmit={(event) => void submit(event)} aria-busy={saving || undefined} className="flex flex-col gap-4 md:gap-6">
        {summaryCount > 0 ? (
          <Alert variant="danger" title={t('employees.create.summary.title')}>
            {t('employees.create.summary.text', { count: summaryCount })}
          </Alert>
        ) : null}
        <Card
          title={t('employees.create.card')}
          description={t('employees.create.cardText')}
          actions={
            <>
              <Button variant="secondary" onClick={() => navigate('/employees')}>
                {t('employees.create.cancel')}
              </Button>
              <Button type="submit" disabled={saving}>
                {t('employees.add')}
              </Button>
            </>
          }
        >
          {/* A disabled fieldset keeps every field as it is while the request runs. */}
          <fieldset disabled={saving} className="flex min-w-0 flex-col gap-6">
            <EmployeeCreatePersonal />
            <EmployeeCreateIdentity errorValues={errorValues} />
            <EmployeeCreateJob companyScope={companyScope} />
          </fieldset>
        </Card>
      </form>
      <UnsavedChangesGuard when={unsaved} title={t('employees.create.leave.title')} description={t('employees.create.leave.text')} confirmLabel={t('employees.create.leave.confirm')} />
    </FormProvider>
  );
}
