// The Bench and Sắp hết dự án tabs when nothing is listed: nobody to show (good news), or nobody in the department.
import { CircleCheck, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StateBlock } from '@/components/ui/state-block';

export type ListStateProps = {
  /** `bench` or `ending`: whose strings. */
  scope: 'bench' | 'ending';
  /** A department or the "only without next" filter narrows the list: "Xóa bộ lọc" is offered. */
  filtered: boolean;
  /** "Only without next" is the filter: it has its own wording. */
  onlyWithoutNext?: boolean;
  /** The ending-soon weeks or the bench threshold, for the wording. */
  value: number;
  onClear: () => void;
};

export function ListState({ scope, filtered, onlyWithoutNext = false, value, onClear }: ListStateProps) {
  const { t } = useTranslation();
  const key = filtered ? (onlyWithoutNext ? 'allHaveNext' : 'noMatch') : 'empty';
  return (
    <Card bare>
      <div role="status">
        <StateBlock
          variant={filtered && !onlyWithoutNext ? 'plain' : 'empty'}
          icon={filtered && !onlyWithoutNext ? <Search /> : <CircleCheck />}
          title={t(`resources.${scope}.${key}.title`)}
          description={t(`resources.${scope}.${key}.text`, { value })}
          actions={
            filtered ? (
              <Button variant="secondary" size="sm" onClick={onClear}>
                {t('resources.filter.clear')}
              </Button>
            ) : undefined
          }
        />
      </div>
    </Card>
  );
}
