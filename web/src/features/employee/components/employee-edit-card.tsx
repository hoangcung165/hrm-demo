// A profile card in edit mode: the Card with its fields, "Đang sửa…" under the title, and in the foot what changed
// (or how many fields to fix), "Hủy" and "Lưu …". The fields are read-only while saving.
import type { ReactNode } from 'react';
import { FormProvider } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { ProfileCardForm } from '../use-profile-card-form';
import { EmployeeEditMeta } from './employee-edit-meta';

export type EmployeeEditCardProps = {
  title: string;
  /** "Lưu thông tin cá nhân" */
  saveLabel: string;
  card: ProfileCardForm;
  children: ReactNode;
};

export function EmployeeEditCard({ title, saveLabel, card, children }: EmployeeEditCardProps) {
  const { t } = useTranslation();
  return (
    <FormProvider {...card.form}>
      <form noValidate onSubmit={(event) => void card.submit(event)} aria-busy={card.saving || undefined}>
        <Card
          title={title}
          description={t('employees.edit.editing')}
          meta={<EmployeeEditMeta changed={card.changed} errorCount={card.errorCount} />}
          actions={
            <>
              <Button variant="secondary" onClick={card.cancel}>
                {t('employees.create.cancel')}
              </Button>
              <Button type="submit" disabled={card.saving}>
                {saveLabel}
              </Button>
            </>
          }
        >
          <fieldset disabled={card.saving} className="flex min-w-0 flex-col gap-4">
            {children}
          </fieldset>
        </Card>
      </form>
    </FormProvider>
  );
}
