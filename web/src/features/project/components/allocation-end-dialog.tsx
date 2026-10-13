// "Kết thúc sớm": the last day of a running allocation, earlier than planned. The allocation stays in
// "Phân bổ đã kết thúc" afterwards, with its history.
import { useId, useState, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { ApiError } from '@/lib/api';
import { formatDate, formatDateRange, toIsoDate } from '@/lib/format';
import type { Allocation } from '../api';
import { useEndAllocation } from '../allocation-api';

export type AllocationEndDialogProps = { projectId: string; allocation: Allocation; onClose: () => void; fallbackFocus?: RefObject<HTMLElement | null> };

/** The message key for a date that cannot end the allocation, or `null`. `today`: the first day it may end on. */
export function endDateError(value: string, allocation: Allocation, today: string): string | null {
  if (!value) return 'projects.allocate.validation.endRequired';
  if (value < allocation.startDate || value < today) return 'projects.allocate.validation.endNotPast';
  if (value >= allocation.endDate) return 'projects.allocate.validation.endNotEarlier';
  return null;
}

export function AllocationEndDialog({ projectId, allocation, onClose, fallbackFocus }: AllocationEndDialogProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const formId = useId();
  const end = useEndAllocation();
  const today = toIsoDate(new Date());
  const [value, setValue] = useState(today < allocation.endDate ? today : '');
  const [error, setError] = useState<string | null>(null);
  const name = allocation.employee?.fullName ?? '';

  const submit = async () => {
    const invalid = endDateError(value, allocation, today);
    setError(invalid);
    if (invalid) return;
    try {
      await end.mutateAsync({ projectId, allocationId: allocation.id, endDate: value });
      toast({ variant: 'success', message: t('projects.allocate.ended', { name, date: formatDate(value) }) });
      onClose();
    } catch (failure) {
      const code = failure instanceof ApiError ? failure.code : '';
      toast({ variant: 'danger', message: t('projects.allocate.endFailed', { name }), detail: code === 'project.closed' ? t('projects.allocate.error.closed') : t('state.errorHint') });
    }
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={t('projects.allocate.endTitle', { name })}
      description={t('projects.allocate.endText', { percent: allocation.percent, range: formatDateRange(allocation.startDate, allocation.endDate) })}
      fallbackFocus={fallbackFocus}
      busy={end.isPending}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('dialog.cancel')}
          </Button>
          <Button type="submit" form={formId} disabled={end.isPending}>
            {t('projects.allocate.endConfirm')}
          </Button>
        </>
      }
    >
      <form
        id={formId}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <Field label={t('projects.allocate.endDate')} required error={error ? t(error, { date: formatDate(allocation.endDate) }) : undefined}>
          {(control) => <Input {...control} type="date" value={value} onChange={(event) => setValue(event.target.value)} />}
        </Field>
      </form>
    </Dialog>
  );
}
