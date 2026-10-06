// Card "Thông tin chung": the company form with its one primary action in the footer.
import { FormProvider } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { UnsavedChangesGuard } from '@/components/layout/unsaved-changes-guard';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatDate, formatTime } from '@/lib/format';
import type { Company } from '../api';
import { useCompanyForm } from '../use-company-form';
import { CompanyFormFields } from './company-form-fields';

export type CompanyFormProps = { company: Company };

export function CompanyForm({ company }: CompanyFormProps) {
  const { t } = useTranslation();
  const { form, submit, saving, dirty, discard } = useCompanyForm(company);
  return (
    <FormProvider {...form}>
      <form noValidate onSubmit={submit}>
        <Card
          title={t('company.general.title')}
          meta={t('company.updatedAt', { time: formatTime(company.updatedAt), date: formatDate(company.updatedAt) })}
          actions={
            <>
              {dirty ? (
                <Button variant="secondary" onClick={discard}>
                  {t('company.discard')}
                </Button>
              ) : null}
              {/* While saving the button keeps its label and is disabled; the fields stay editable. */}
              <Button type="submit" disabled={!dirty || saving}>
                {t('company.save')}
              </Button>
            </>
          }
        >
          <CompanyFormFields />
        </Card>
      </form>
      <UnsavedChangesGuard when={dirty} title={t('company.leave.title')} description={t('company.leave.text')} confirmLabel={t('company.leave.confirm')} />
    </FormProvider>
  );
}
