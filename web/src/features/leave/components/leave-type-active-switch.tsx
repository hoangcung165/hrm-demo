// "Đang dùng": turns a type on or off at once. An inactive type is not offered on new requests; requests and balances
// that already have it keep it.
import { useTranslation } from 'react-i18next';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { errorMessage } from '@/features/auth/error-message';
import { useUpdateLeaveType, type LeaveTypeItem } from '../policy-api';

export type LeaveTypeActiveSwitchProps = { type: LeaveTypeItem };

export function LeaveTypeActiveSwitch({ type }: LeaveTypeActiveSwitchProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const update = useUpdateLeaveType(type.id);
  return (
    <Switch
      checked={type.active}
      label={t('leave.policy.active')}
      locked={update.isPending}
      onChange={(active) =>
        update.mutate(
          { name: type.name, active },
          {
            onSuccess: () => toast({ variant: 'success', message: t(active ? 'leave.policy.turnedOn' : 'leave.policy.turnedOff', { name: type.name }) }),
            onError: (error) => toast({ variant: 'danger', message: t('leave.policy.saveFailed', { name: type.name }), detail: errorMessage(error, t) }),
          },
        )
      }
    />
  );
}
