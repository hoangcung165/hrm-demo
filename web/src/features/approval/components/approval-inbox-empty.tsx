// A tab with no row: nothing yet in that tab (with the next step), or nothing matches the search and type.
import { CheckCheck, Inbox, Search, Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StateBlock } from '@/components/ui/state-block';
import type { ApprovalFilters } from '../use-approval-filters';

const ICONS = { WAITING: <CheckCheck />, SENT: <Send />, HANDLED: <Inbox /> } as const;

export type ApprovalInboxEmptyProps = { filters: ApprovalFilters };

export function ApprovalInboxEmpty({ filters }: ApprovalInboxEmptyProps) {
  const { t } = useTranslation();
  const { box, q } = filters.query;
  if (filters.filtered) {
    return (
      <Card bare>
        <StateBlock
          variant="plain"
          icon={<Search />}
          title={q ? t('approvals.empty.noMatch.titleQuery', { query: q }) : t('approvals.empty.noMatch.title')}
          description={t('approvals.empty.noMatch.text')}
          actions={
            <Button variant="secondary" size="sm" onClick={filters.clear}>
              {t('approvals.filter.clear')}
            </Button>
          }
        />
      </Card>
    );
  }
  return (
    <Card bare>
      <StateBlock
        variant="empty"
        icon={ICONS[box]}
        title={t(`approvals.empty.${box}.title`)}
        description={t(`approvals.empty.${box}.text`)}
        actions={
          box === 'WAITING' ? (
            <Button variant="secondary" size="sm" onClick={() => filters.setBox('HANDLED')}>
              {t('approvals.empty.WAITING.action')}
            </Button>
          ) : undefined
        }
      />
    </Card>
  );
}
