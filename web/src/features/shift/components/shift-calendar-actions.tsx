// The buttons over the calendar for an Account that may assign shifts: "Phân ca" and "Ca mặc định".
import { CalendarPlus, Settings2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import type { AssignDialogs } from '../use-assign-dialogs';

export function ShiftCalendarActions({ dialogs }: { dialogs: AssignDialogs }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button ref={dialogs.toolbarButton} onClick={() => dialogs.openAssign()}>
        <CalendarPlus aria-hidden="true" />
        {t('shiftAssign.actions.assign')}
      </Button>
      <Button variant="secondary" onClick={dialogs.openDefault}>
        <Settings2 aria-hidden="true" />
        {t('shiftAssign.actions.default')}
      </Button>
    </div>
  );
}
