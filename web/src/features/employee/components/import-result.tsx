// The end of the import: how many were added, their codes, what was skipped, and where to go next.
import { CircleCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StateBlock } from '@/components/ui/state-block';
import { formatNumber } from '@/lib/format';
import type { ImportResult } from '../import-api';

/** The list with the newest hires first, every status: the people just imported are on top. */
export const IMPORTED_LIST_PATH = '/employees?sort=newest&status=ALL';

export function ImportResultBlock({ result, onAnother }: { result: ImportResult; onAnother: () => void }) {
  const { t } = useTranslation();
  const first = result.created[0]?.code;
  const last = result.created.at(-1)?.code;
  const skipped = [
    result.skippedInvalidRows > 0 ? t('employees.import.result.skippedErrors', { m: formatNumber(result.skippedInvalidRows), count: result.skippedInvalidRows }) : null,
    result.existingRows > 0 ? t('employees.import.result.skippedExisting', { k: formatNumber(result.existingRows), count: result.existingRows }) : null,
  ].filter(Boolean);
  const codes = first && last ? (first === last ? t('employees.import.result.code', { code: first }) : t('employees.import.result.codes', { first, last })) : '';
  const description = [codes, skipped.length > 0 ? t('employees.import.result.skipped', { parts: skipped.join(t('employees.import.result.and')) }) : ''].filter(Boolean).join(' ');
  return (
    <Card bare>
      <StateBlock
        variant="success"
        icon={<CircleCheck />}
        title={t('employees.import.result.title', { n: formatNumber(result.createdCount), count: result.createdCount })}
        description={description}
        actions={
          <>
            <Button variant="secondary" onClick={onAnother}>
              {t('employees.import.result.another')}
            </Button>
            <Link to={IMPORTED_LIST_PATH} className={buttonVariants()}>
              {t('employees.import.result.view')}
            </Link>
          </>
        }
      />
    </Card>
  );
}
