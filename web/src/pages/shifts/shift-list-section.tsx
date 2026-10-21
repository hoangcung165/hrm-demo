// The shifts of the company with the status filter and the list's loading, empty, no-match and error states (pattern P10).
import { Clock, Plus, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { Select } from '@/components/ui/select';
import { StateBlock } from '@/components/ui/state-block';
import { useShifts } from '@/features/shift/api';
import { ShiftTable } from '@/features/shift/components/shift-table';
import { useShiftActions } from '@/features/shift/shift-actions-context';

const STATUSES = ['ALL', 'ACTIVE', 'INACTIVE'] as const;
type StatusFilter = (typeof STATUSES)[number];

export function ShiftListSection() {
  const { t } = useTranslation();
  const actions = useShiftActions();
  const shifts = useShifts();
  const [params, setParams] = useSearchParams();
  const raw = params.get('status');
  const status: StatusFilter = STATUSES.includes(raw as StatusFilter) ? (raw as StatusFilter) : 'ALL';
  const setStatus = (next: StatusFilter) => setParams(next === 'ALL' ? {} : { status: next }, { replace: true });

  const all = shifts.data;
  const rows = (all ?? []).filter((shift) => status === 'ALL' || shift.active === (status === 'ACTIVE'));
  const loaded = Boolean(all) && !shifts.isError;
  const noShifts = loaded && all!.length === 0;
  const noMatch = loaded && !noShifts && rows.length === 0;

  return (
    <div className="flex flex-col gap-4">
      <div role="search" aria-label={t('shifts.filter.label')} className="flex flex-wrap items-center gap-3">
        <Select
          aria-label={t('shifts.filter.status')}
          value={status}
          onChange={(value) => setStatus(value as StatusFilter)}
          options={STATUSES.map((value) => ({ value, label: t(`shifts.filter.option.${value}`) }))}
          placeholder={t('shifts.filter.status')}
          disabled={!all}
          className="max-md:h-11 max-md:min-w-0 max-md:flex-1 md:w-50"
        />
      </div>
      {/* Always in the page, so a filter that ends with nothing is announced. */}
      <div role="status">
        {noMatch ? (
          <Card bare>
            <StateBlock
              variant="plain"
              icon={<Search />}
              title={t('shifts.noMatch.title')}
              description={t('shifts.noMatch.text')}
              actions={
                <Button variant="secondary" size="sm" onClick={() => setStatus('ALL')}>
                  {t('shifts.filter.clear')}
                </Button>
              }
            />
          </Card>
        ) : null}
        {noShifts ? (
          <Card bare>
            <StateBlock
              variant="empty"
              icon={<Clock />}
              title={t('shifts.empty.title')}
              description={t(actions ? 'shifts.empty.text' : 'shifts.empty.textReadOnly')}
              actions={
                actions ? (
                  <Button size="sm" onClick={actions.openAdd}>
                    <Plus aria-hidden="true" />
                    {t('shifts.add')}
                  </Button>
                ) : undefined
              }
            />
          </Card>
        ) : null}
      </div>
      {shifts.isError ? (
        <Card bare>
          <ErrorState title={t('shifts.loadError')} description={t('state.errorHint')} onRetry={() => void shifts.refetch()} />
        </Card>
      ) : noShifts || noMatch ? null : (
        <ShiftTable rows={rows} loading={!all} />
      )}
    </div>
  );
}
