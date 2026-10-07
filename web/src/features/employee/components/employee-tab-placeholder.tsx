// A profile tab that is not built yet: what it will hold, for whom. No action.
import { createElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PLACEHOLDER_ICONS, type PlaceholderTab } from '../profile-tabs';

export type EmployeeTabPlaceholderProps = { tab: PlaceholderTab; fullName: string };

export function EmployeeTabPlaceholder({ tab, fullName }: EmployeeTabPlaceholderProps) {
  const { t } = useTranslation();
  return (
    <Card bare>
      <EmptyState
        icon={createElement(PLACEHOLDER_ICONS[tab])}
        title={t('employees.profile.placeholder.title', { tab: t(`employees.profile.tab.${tab}`) })}
        description={t(`employees.profile.placeholder.${tab}`, { name: fullName })}
      />
    </Card>
  );
}
