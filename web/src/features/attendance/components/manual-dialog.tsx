// "Công thủ công": what the timekeeper enters for a cell, a person's week, a day of the unit or the whole week. One
// kind for every day the scope covers (days without a shift are skipped by the server and reported in the toast);
// "Xóa" removes the entries the scope has, giving those days back to the punches.
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Radio } from '@/components/ui/radio';
import { Textarea } from '@/components/ui/textarea';
import { formatDateRange } from '@/lib/format';
import type { ManualKind } from '../daily-api';
import type { ManualRow } from '../manual-api';
import type { ManualScope } from '../manual-model';
import { MANUAL_NOTE_MAX, useManualForm } from '../use-manual-form';
import { dayLabel } from './daily-cells';

const KINDS: ManualKind[] = ['FULL', 'HALF', 'ABSENT', 'TIMES'];

export type ManualDialogProps = { scope: ManualScope; rows: ManualRow[]; orgUnitId: string; unitName: string; from: string; last: string; onClose: () => void };

export function ManualDialog({ scope, rows, orgUnitId, unitName, from, last, onClose }: ManualDialogProps) {
  const { t } = useTranslation();
  const formId = useId();
  const form = useManualForm({ scope, rows, orgUnitId, from, last, onDone: onClose });
  const range = formatDateRange(from, last);
  const heading =
    scope.kind === 'cell'
      ? { title: scope.row.employee.fullName, description: t('attendanceManual.dialog.cell', { day: dayLabel(scope.date, t) }) }
      : scope.kind === 'row'
        ? { title: scope.row.employee.fullName, description: t('attendanceManual.dialog.row', { range }) }
        : scope.kind === 'day'
          ? { title: unitName, description: t('attendanceManual.dialog.day', { day: dayLabel(scope.date, t), count: rows.length }) }
          : { title: unitName, description: t('attendanceManual.dialog.all', { range, count: rows.length }) };
  const error = (key?: string) => (key ? t(key) : undefined);
  return (
    <Dialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={t('attendanceManual.dialog.title', { who: heading.title })}
      description={heading.description}
      busy={form.busy}
      footer={
        <>
          {form.canClear ? (
            <Button variant="ghost" className="mr-auto text-danger hover:bg-surface-muted" onClick={() => void form.remove()} disabled={form.busy}>
              {t('attendanceManual.dialog.clear', { count: form.existingCount })}
            </Button>
          ) : null}
          <Button variant="secondary" onClick={onClose}>
            {t('dialog.cancel')}
          </Button>
          <Button type="submit" form={formId} disabled={form.busy}>
            {t('attendanceManual.dialog.save')}
          </Button>
        </>
      }
    >
      <form id={formId} noValidate onSubmit={(event) => { event.preventDefault(); void form.submit(); }} className="flex flex-col gap-4">
        {form.problem ? <Alert variant="danger" title={form.problem} /> : null}
        <fieldset className="flex min-w-0 flex-col gap-2">
          <legend className="mb-2 text-[14px] leading-5 font-medium text-ink">{t('attendanceManual.dialog.kind')}</legend>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            {KINDS.map((kind) => (
              <Radio key={kind} name={`${formId}-kind`} value={kind} checked={form.values.kind === kind} onChange={() => form.setKind(kind)}>
                <span className="flex flex-col">
                  <span>{t(`attendanceManual.kind.${kind}`)}</span>
                  <span className="text-caption text-ink-muted">{t(`attendanceManual.kindHelp.${kind}`)}</span>
                </span>
              </Radio>
            ))}
          </div>
        </fieldset>
        {form.values.kind === 'TIMES' ? (
          <div className="grid grid-cols-2 gap-4">
            <Field label={t('attendanceManual.dialog.in')} required error={error(form.errors.in)}>
              {(control) => <Input {...control} inputMode="numeric" placeholder="08:00" value={form.values.in} onChange={(event) => form.setIn(event.target.value)} className="tabular-nums" />}
            </Field>
            <Field label={t('attendanceManual.dialog.out')} required error={error(form.errors.out)} helper={t('attendanceManual.dialog.outHelp')}>
              {(control) => <Input {...control} inputMode="numeric" placeholder="17:00" value={form.values.out} onChange={(event) => form.setOut(event.target.value)} className="tabular-nums" />}
            </Field>
          </div>
        ) : null}
        <Field label={t('attendanceManual.dialog.note')} error={error(form.errors.note)} helper={t('attendanceManual.dialog.noteHelp', { max: MANUAL_NOTE_MAX })}>
          {(control) => <Textarea {...control} rows={2} value={form.values.note} onChange={(event) => form.setNote(event.target.value)} />}
        </Field>
      </form>
    </Dialog>
  );
}
