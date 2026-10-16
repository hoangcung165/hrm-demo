// The selected type's policy on "Cấu hình nghỉ phép" (artboard `#18 Cấu hình nghỉ phép`), or a new type: general
// rules, the limit and carry-over, the date it applies from; "Hủy thay đổi" and "Lưu chính sách" below.
import { FormProvider } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { LeaveTypeItem } from '../policy-api';
import { useLeavePolicyForm } from '../use-leave-policy-form';
import { LeavePolicyApply } from './leave-policy-apply';
import { LeavePolicyGeneral } from './leave-policy-general';
import { LeavePolicyLimit } from './leave-policy-limit';
import { LeaveTypeActiveSwitch } from './leave-type-active-switch';

export type LeavePolicyFormProps = {
  /** null: a new type. */
  type: LeaveTypeItem | null;
  onSaved: (saved: LeaveTypeItem) => void;
  onCancelNew: () => void;
};

export function LeavePolicyForm({ type, onSaved, onCancelNew }: LeavePolicyFormProps) {
  const { t } = useTranslation();
  const { form, submit, saving, discard } = useLeavePolicyForm(type, onSaved);
  const dirty = form.formState.isDirty;
  return (
    <FormProvider {...form}>
      <form noValidate onSubmit={(event) => void submit(event)} aria-label={type ? t('leave.policy.formOf', { name: type.name }) : t('leave.policy.newTitle')}>
        <Card
          title={type ? type.name : t('leave.policy.newTitle')}
          titleAside={type ? <LeaveTypeActiveSwitch type={type} /> : null}
          description={t(type ? 'leave.policy.formIntro' : 'leave.policy.newIntro')}
          actions={
            <>
              <Button variant="secondary" className="max-md:h-11" disabled={saving || (type !== null && !dirty)} onClick={type ? discard : onCancelNew}>
                {t('leave.policy.discard')}
              </Button>
              <Button type="submit" className="max-md:h-11" disabled={saving} aria-busy={saving || undefined}>
                {saving ? t('leave.policy.saving') : t(type ? 'leave.policy.save' : 'leave.policy.create')}
              </Button>
            </>
          }
        >
          <div className="flex flex-col gap-6">
            <LeavePolicyGeneral creating={type === null} />
            <LeavePolicyLimit />
            <LeavePolicyApply versions={type?.versions ?? []} inForce={type?.policy?.effectiveFrom ?? null} />
          </div>
        </Card>
      </form>
    </FormProvider>
  );
}
