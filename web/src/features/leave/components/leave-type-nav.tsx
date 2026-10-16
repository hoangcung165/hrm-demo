// The types on "Cấu hình nghỉ phép", left of the policy: each with its rule, an inactive one marked "Đã tắt"; the
// selected one is current. "Thêm loại nghỉ" below.
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatDays } from '../leave-format';
import { leaveTypeRule } from '../leave-type-rule';
import type { LeaveTypeItem } from '../policy-api';

export type LeaveTypeNavProps = {
  types: LeaveTypeItem[];
  /** The selected type's id, or `new`. */
  selected: string;
  onSelect: (id: string) => void;
};

export function LeaveTypeNav({ types, selected, onSelect }: LeaveTypeNavProps) {
  const { t } = useTranslation();
  const caption = (type: LeaveTypeItem) => {
    const p = type.policy;
    if (!p) return '';
    if (p.limited && p.entitlementDays !== null) return t('leave.policy.navLimited', { days: formatDays(p.entitlementDays) });
    return leaveTypeRule(t, p, p);
  };
  return (
    <nav aria-label={t('leave.policy.types')} className="flex flex-col gap-3">
      <h2 className="text-body-strong">{t('leave.policy.types')}</h2>
      <ul className="flex flex-col gap-1">
        {types.map((type) => (
          <li key={type.id}>
            <button
              type="button"
              aria-current={selected === type.id ? 'true' : undefined}
              onClick={() => onSelect(type.id)}
              className={cn(
                'flex w-full min-w-0 flex-col items-start gap-0.5 rounded-md border border-transparent px-3 py-2 text-left hover:bg-surface-muted focus-visible:shadow-focus-ring',
                selected === type.id && 'border-brand-blue bg-info',
              )}
            >
              <span className="flex w-full items-center gap-2">
                <span className="min-w-0 flex-1 truncate font-medium">{type.name}</span>
                {type.active ? null : <Badge>{t('leave.policy.inactive')}</Badge>}
              </span>
              <span className="text-caption text-ink-muted">{[type.code, caption(type)].filter(Boolean).join(' · ')}</span>
            </button>
          </li>
        ))}
      </ul>
      <Button variant="secondary" className="self-start max-md:h-11" aria-pressed={selected === 'new'} onClick={() => onSelect('new')}>
        <Plus aria-hidden="true" />
        {t('leave.policy.add')}
      </Button>
    </nav>
  );
}
