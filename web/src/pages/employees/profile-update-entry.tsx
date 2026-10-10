// On the Employee's own profile, for Accounts that cannot edit it: "Đề nghị cập nhật" opens the request dialog, and a
// request still open (waiting or returned) is shown with a link instead.
import { FilePen } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import type { EmployeeProfile } from '@/features/employee/api';
import { useOpenProfileUpdate } from '@/features/profile-update/api';
import { ProfileUpdateDialog } from '@/features/profile-update/components/profile-update-dialog';
import { ProfileUpdateStatus } from '@/features/profile-update/components/profile-update-status';
import { valuesOf } from '@/features/profile-update/schema';

export function useProfileUpdateEntry(employee: EmployeeProfile, enabled: boolean) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const pending = useOpenProfileUpdate(enabled);
  return {
    status: enabled && pending ? <ProfileUpdateStatus open={pending} /> : null,
    button:
      enabled && !pending ? (
        <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
          <FilePen aria-hidden="true" className="!size-4" />
          {t('profileUpdate.request')}
        </Button>
      ) : undefined,
    dialog: open ? <ProfileUpdateDialog initial={valuesOf(employee)} onClose={() => setOpen(false)} /> : null,
  };
}
