// "Ủy quyền duyệt" (artboard `#12 Ủy quyền duyệt`): the delegate, the first and last day, the request types (never
// payroll), and what the delegate will see. Errors say the cause and the fix; a clash with another delegation comes
// back from the API and shows above the buttons.
import { useTranslation } from 'react-i18next';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { SearchSelect } from '@/components/ui/search-select';
import { useToast } from '@/components/ui/use-toast';
import { errorMessage } from '@/features/auth/error-message';
import { formatDate } from '@/lib/format';
import { DELEGABLE_TYPES, useDelegationActions } from '../delegation-api';
import { useDelegationForm } from '../use-delegation-form';

export type ApprovalDelegationDialogProps = {
  /** The caller's name, for "… duyệt thay <name>". */
  me: string;
  onClose: () => void;
};

/** Mounted while open, so every opening starts empty. */
export function ApprovalDelegationDialog({ me, onClose }: ApprovalDelegationDialogProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const form = useDelegationForm(t);
  const { create } = useDelegationActions();
  const { errors } = form;
  const save = () => {
    const input = form.submit();
    if (!input) return;
    create.mutate(input, {
      onSuccess: (saved) => {
        toast({ variant: 'success', message: t('delegations.dialog.saved', { name: saved.delegate.fullName, to: formatDate(saved.endDate) }) });
        onClose();
      },
    });
  };
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      size="wide"
      title={t('delegations.dialog.title')}
      description={t('delegations.dialog.text', { me })}
      busy={create.isPending}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('dialog.cancel')}
          </Button>
          <Button disabled={create.isPending} onClick={save}>
            {t('delegations.dialog.save')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label={t('delegations.dialog.delegate')} required error={errors.delegate}>
          {(control) => (
            <SearchSelect
              {...control}
              value={form.delegateId}
              onChange={form.choose}
              options={form.options}
              search={form.search}
              onSearch={form.setSearch}
              onEngage={form.engage}
              searchLabel={t('delegations.dialog.search')}
              placeholder={t('delegations.dialog.choose')}
            />
          )}
        </Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={t('delegations.dialog.from')} required error={errors.from}>
            {(control) => <Input {...control} type="date" min={form.today} value={form.from} onChange={(event) => form.setFrom(event.target.value)} />}
          </Field>
          <Field label={t('delegations.dialog.to')} required error={errors.to}>
            {(control) => <Input {...control} type="date" min={form.from || form.today} value={form.to} onChange={(event) => form.setTo(event.target.value)} />}
          </Field>
        </div>
        <fieldset aria-describedby="delegation-types-note" className="flex min-w-0 flex-col gap-2">
          <legend className="mb-2 text-[14px] leading-5 font-medium">
            {t('delegations.dialog.types')}
            <span aria-hidden="true" className="text-danger">
              {' '}
              *
            </span>
          </legend>
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            {DELEGABLE_TYPES.map((type) => (
              <Checkbox key={type} checked={form.types.includes(type)} onChange={() => form.toggleType(type)}>
                {t(`approvals.type.${type}`)}
              </Checkbox>
            ))}
          </div>
          <span id="delegation-types-note" role={errors.types ? 'alert' : undefined} className={errors.types ? 'text-caption text-danger' : 'text-caption text-ink-muted'}>
            {errors.types ?? t('delegations.dialog.typesNote')}
          </span>
        </fieldset>
        {form.delegate && form.from ? (
          <Alert variant="info" title={t('delegations.dialog.info', { from: formatDate(form.from), name: form.delegate.fullName })} />
        ) : null}
        {create.isError ? (
          <Alert variant="danger" title={t('delegations.dialog.failed')}>
            {errorMessage(create.error, t)}
          </Alert>
        ) : null}
      </div>
    </Dialog>
  );
}
