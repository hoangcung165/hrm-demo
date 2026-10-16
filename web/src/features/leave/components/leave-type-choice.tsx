// "Loại nghỉ" of the request form: the active types as Radio cards, each with what is left of it ("Còn 4,5 · ứng
// thêm được 2") or its rule ("Cần đính kèm giấy tờ").
import { useTranslation } from 'react-i18next';
import { FormGroup } from '@/components/ui/form-group';
import { RadioCard } from '@/components/ui/radio-card';
import type { LeaveBalanceItem } from '../api';
import { formatDays } from '../leave-format';
import { leaveTypeRule } from '../leave-type-rule';
import type { LeaveTypeItem } from '../policy-api';

export type LeaveTypeChoiceProps = {
  types: LeaveTypeItem[];
  balances: Map<string, LeaveBalanceItem>;
  value: string;
  onChange: (id: string) => void;
  error?: string;
};

export function LeaveTypeChoice({ types, balances, value, onChange, error }: LeaveTypeChoiceProps) {
  const { t } = useTranslation();
  const caption = (type: LeaveTypeItem) => {
    const item = balances.get(type.id);
    const remaining = item?.balance.remaining;
    if (item && remaining !== null && remaining !== undefined) {
      const left = t('leave.form.typeLeft', { days: formatDays(remaining) });
      return item.balance.advanceAvailable > 0 ? `${left} · ${t('leave.form.typeAdvance', { days: formatDays(item.balance.advanceAvailable) })}` : left;
    }
    if (!type.policy) return undefined;
    return leaveTypeRule(t, { pay: type.policy.pay, attachmentRequired: type.policy.attachmentRequired }, type.policy);
  };
  return (
    <FormGroup legend={t('leave.form.type')} required error={error} className="border-t-0 pt-0">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
        {types.map((type) => (
          <RadioCard
            key={type.id}
            name="leave-type"
            value={type.id}
            checked={value === type.id}
            onChange={() => onChange(type.id)}
            title={type.name}
            caption={caption(type)}
          />
        ))}
      </div>
    </FormGroup>
  );
}
