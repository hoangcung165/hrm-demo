// Ca làm việc (HRM-22; Chấm công và nghỉ phép › Ca làm việc): the shift patterns of the company. Needs SHIFT_VIEW;
// with SHIFT_EDIT it adds, edits, turns off and turns on shifts, without it the page says it is read-only.
import { Plus, ShieldOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StateBlock } from '@/components/ui/state-block';
import { useCurrentAccount } from '@/features/auth/account-context';
import { ShiftActionsProvider } from '@/features/shift/components/shift-actions-provider';
import { useShiftActions } from '@/features/shift/shift-actions-context';
import { ShiftListSection } from './shift-list-section';

export function ShiftsPage() {
  const { t } = useTranslation();
  const { permissions } = useCurrentAccount();
  const canView = permissions.includes('SHIFT_VIEW');
  const canEdit = permissions.includes('SHIFT_EDIT');
  return (
    <ShiftActionsProvider enabled={canView && canEdit}>
      <div className="flex flex-col gap-4 md:gap-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h1 className="text-title">{t('shifts.title')}</h1>
            <p className="text-body-small text-ink-muted">{t('shifts.intro')}</p>
          </div>
          {canView ? <AddButton /> : null}
        </div>
        {canView ? (
          <>
            {canEdit ? null : (
              <Alert variant="info" title={t('shifts.readOnly.title')}>
                {t('shifts.readOnly.text')}
              </Alert>
            )}
            <ShiftListSection />
          </>
        ) : (
          <Card bare>
            <StateBlock variant="denied" icon={<ShieldOff />} title={t('shifts.denied.title')} description={t('shifts.denied.text')} />
          </Card>
        )}
      </div>
    </ShiftActionsProvider>
  );
}

/** "Thêm ca làm việc"; absent without SHIFT_EDIT. */
function AddButton() {
  const { t } = useTranslation();
  const actions = useShiftActions();
  if (!actions) return null;
  return (
    <Button ref={actions.addButtonRef} onClick={actions.openAdd} className="max-md:h-11">
      <Plus aria-hidden="true" />
      {t('shifts.add')}
    </Button>
  );
}
