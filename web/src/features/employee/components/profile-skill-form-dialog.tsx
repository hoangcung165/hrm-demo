import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useId } from 'react';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Select } from '@/components/ui/select';
import { ApiError } from '@/lib/api';
import { useSkillCatalog, type EmployeeSkill, type SkillBody } from '../profile-qualifications-api';
import { skillFormSchema, type SkillFormValues } from '../profile-qualifications-schemas';

export type ProfileSkillFormDialogProps = {
  record: EmployeeSkill | null;
  usedSkillIds: string[];
  onSave: (body: SkillBody) => Promise<void>;
  onClose: () => void;
  onDirty: (value: boolean) => void;
};

export function ProfileSkillFormDialog({ record, usedSkillIds, onSave, onClose, onDirty }: ProfileSkillFormDialogProps) {
  const { t } = useTranslation();
  const k = 'employees.profile.qualifications';
  const formId = useId();
  const skillId = useId();
  const levelId = useId();
  const catalog = useSkillCatalog();
  const form = useForm<SkillFormValues>({ resolver: zodResolver(skillFormSchema), mode: 'onTouched',
    defaultValues: { skillId: record?.skill.id ?? '', level: record?.level ?? 1 } });
  const { isDirty, isSubmitting, errors } = form.formState;
  useEffect(() => onDirty(isDirty), [isDirty, onDirty]);
  const close = () => { if (!isSubmitting) { onDirty(false); onClose(); } };
  const submit = form.handleSubmit(async body => {
    try { await onSave(body); onDirty(false); onClose(); }
    catch (error) {
      form.setError('root', { message: error instanceof ApiError && error.code === 'employee.skill_duplicate'
        ? `${k}.duplicate` : error instanceof ApiError && error.status === 403 ? `${k}.forbidden` : `${k}.saveFailed` });
    }
  });
  const options = (catalog.data ?? []).filter(item => item.active || item.id === record?.skill.id)
    .map(item => ({ value: item.id, label: item.name, disabled: usedSkillIds.includes(item.id) && item.id !== record?.skill.id }));
  if (record && !options.some(item => item.value === record.skill.id)) {
    options.unshift({ value: record.skill.id, label: record.skill.name, disabled: false });
  }
  const levels = [1, 2, 3, 4, 5].map(value => ({ value: String(value), label: t(`${k}.levelValue`, { level: value }) }));
  return (
    <Dialog open onOpenChange={value => { if (!value && !isDirty) close(); }}
      title={t(record ? `${k}.editSkill` : `${k}.addSkill`)} busy={isSubmitting}
      footer={<><Button variant="secondary" disabled={isSubmitting} onClick={close}>{t('dialog.cancel')}</Button>
        <Button type="submit" form={formId} disabled={isSubmitting || catalog.isPending}>{t(`${k}.save`)}</Button></>}>
      <FormProvider {...form}>
        <form id={formId} onSubmit={event => void submit(event)} noValidate className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor={skillId} className="text-sm font-medium">{t(`${k}.skill`)} <span aria-hidden="true" className="text-danger">*</span></label>
            <Controller control={form.control} name="skillId" render={({ field }) => (
              <Select id={skillId} value={field.value} onChange={field.onChange} options={options}
                placeholder={t(`${k}.chooseSkill`)} disabled={isSubmitting || catalog.isPending} invalid={Boolean(errors.skillId)} />
            )} />
            {errors.skillId ? <p role="alert" className="text-caption text-danger">{t(errors.skillId.message!)}</p> : null}
            {catalog.isError ? <p role="alert" className="text-caption text-danger">{t(`${k}.catalogFailed`)}</p> : null}
            {catalog.data?.length === 0 ? <p className="text-caption text-ink-muted">{t(`${k}.catalogEmpty`)}</p> : null}
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor={levelId} className="text-sm font-medium">{t(`${k}.level`)} <span aria-hidden="true" className="text-danger">*</span></label>
            <Controller control={form.control} name="level" render={({ field }) => (
              <Select id={levelId} value={String(field.value)} onChange={value => field.onChange(Number(value))}
                options={levels} placeholder={t(`${k}.chooseLevel`)} disabled={isSubmitting} />
            )} />
          </div>
          {errors.root ? <p role="alert" className="text-caption text-danger">{t(errors.root.message!)}</p> : null}
        </form>
      </FormProvider>
    </Dialog>
  );
}
