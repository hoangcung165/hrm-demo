// The state of a contract on the company date, always in words: colour only repeats what the text says.
import { useTranslation } from 'react-i18next';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import type { ContractListState } from '../list-api';

const VARIANT: Record<ContractListState, NonNullable<BadgeProps['variant']>> = {
  UPCOMING: 'info',
  CURRENT: 'success',
  EXPIRING: 'warning',
  ENDED: 'neutral',
};

export type ContractStateBadgeProps = { state: ContractListState };

export function ContractStateBadge({ state }: ContractStateBadgeProps) {
  const { t } = useTranslation();
  return <Badge variant={VARIANT[state]}>{t(`contractList.state.${state}`)}</Badge>;
}
