// What the call would do, before it is sent: a line that is read out when it changes. Worked out from the calendar of the
// range (see `assign-model`), so it is what the server will do unless somebody changed the plan meanwhile.
import { useTranslation } from 'react-i18next';
import { formatNumber } from '@/lib/format';
import type { AssignMode } from '../use-assign-form';
import type { AssignPreview } from '../assign-model';

export type ShiftAssignPreviewProps = {
  mode: AssignMode;
  /** `undefined` until there is enough to count. */
  preview: AssignPreview | { employees: number; removed: number } | undefined;
  loading: boolean;
  failed: boolean;
};

export function ShiftAssignPreview({ mode, preview, loading, failed }: ShiftAssignPreviewProps) {
  const { t } = useTranslation();
  let text: string;
  if (failed) text = t('shiftAssign.preview.failed');
  else if (loading) text = t('shiftAssign.preview.loading');
  else if (!preview) text = t(mode === 'ASSIGN' ? 'shiftAssign.preview.idleAssign' : 'shiftAssign.preview.idleClear');
  else if ('removed' in preview) text = preview.removed > 0 ? t('shiftAssign.preview.clear', { removed: formatNumber(preview.removed), count: preview.employees }) : t('shiftAssign.preview.clearNone');
  else if (preview.employees === 0 || preview.days === 0) text = t('shiftAssign.preview.nothing');
  else
    text = t('shiftAssign.preview.assign', { count: preview.employees, days: formatNumber(preview.days), created: formatNumber(preview.created), replaced: formatNumber(preview.replaced), unchanged: formatNumber(preview.unchanged) });
  const skipped = preview && 'days' in preview && (preview.skippedHolidays > 0 || preview.skippedDaysOff > 0) ? t('shiftAssign.preview.skipped', { holidays: preview.skippedHolidays, off: preview.skippedDaysOff }) : '';
  const replaced = preview && 'replaced' in preview ? preview.replaced : 0;
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-1 rounded-md bg-surface-muted px-4 py-3 text-body-small">
      <p>{text}</p>
      {replaced > 0 ? <p className="font-semibold">{t('shiftAssign.preview.replaces', { count: replaced })}</p> : null}
      {skipped ? <p className="text-ink-muted">{skipped}</p> : null}
    </div>
  );
}
