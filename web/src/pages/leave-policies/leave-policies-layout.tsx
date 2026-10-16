// The two columns of "Cấu hình nghỉ phép"; at 390 the types become a Select above the policy. A saved new type is
// selected; a type that is no longer there falls back to the first.
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { Select } from '@/components/ui/select';
import { LeavePolicyForm } from '@/features/leave/components/leave-policy-form';
import { LeaveTypeNav } from '@/features/leave/components/leave-type-nav';
import type { LeaveTypeItem } from '@/features/leave/policy-api';
import { useMediaQuery } from '@/lib/use-media-query';

export type LeavePoliciesLayoutProps = { types: LeaveTypeItem[] };

export function LeavePoliciesLayout({ types }: LeavePoliciesLayoutProps) {
  const { t } = useTranslation();
  const compact = useMediaQuery('(max-width: 767px)');
  const [params, setParams] = useSearchParams();
  const asked = params.get('type');
  const selected = asked === 'new' ? 'new' : (types.find((type) => type.id === asked) ?? types[0])?.id ?? 'new';
  const type = types.find((each) => each.id === selected) ?? null;
  const select = (id: string) => setParams(id === types[0]?.id ? {} : { type: id }, { replace: true });
  const form = <LeavePolicyForm key={selected} type={type} onSaved={(saved) => select(saved.id)} onCancelNew={() => select(types[0]?.id ?? 'new')} />;
  if (compact) {
    return (
      <div className="flex flex-col gap-4">
        <Select
          aria-label={t('leave.policy.types')}
          value={selected}
          onChange={select}
          options={[...types.map((each) => ({ value: each.id, label: each.active ? each.name : `${each.name} (${t('leave.policy.inactive')})` })), { value: 'new', label: t('leave.policy.add') }]}
          placeholder={t('leave.policy.types')}
          className="h-11"
        />
        {form}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-[280px_minmax(0,1fr)] items-start gap-6">
      <LeaveTypeNav types={types} selected={selected} onSelect={select} />
      {form}
    </div>
  );
}
